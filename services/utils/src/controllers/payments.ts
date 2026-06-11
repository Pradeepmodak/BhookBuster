import { Response } from "express";
import axios from "axios";
import { razorpay } from "../config/razorpay.js"
import { verifyRazorpaySignature } from "../config/verifyRazorpay.js";
import { publishPaymentSuccess } from "../config/payment.producer.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";

type OrderForPayment = {
    orderId: string;
    amount: number;
    currency: string;
    userId: string;
};

const fetchOrderForPayment = async (orderId: string): Promise<OrderForPayment> => {
    const { data } = await axios.get(
        `${process.env.RESTAURANT_SERVICE}/api/order/payment/${orderId}`,
        {
            headers: {
                "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
            },
        }
    );

    return data;
};

const ensureOrderBelongsToUser = (
    order: OrderForPayment,
    userId: string | undefined
) => {
    if (!userId || order.userId !== userId) {
        return false;
    }

    return true;
};

export const createRazorpayOrder = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { orderId } = req.body;
        const order = await fetchOrderForPayment(orderId);

        if (!ensureOrderBelongsToUser(order, req.user?._id)) {
            return res.status(403).json({
                message: "Forbidden",
            });
        }

        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(order.amount * 100),
            currency: "INR",
            receipt: orderId,
        });
        res.json({
            razorpayOrderId: razorpayOrder.id,
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (error: any) {
        console.error("Razorpay order creation error:", error.response?.data || error.message);
        res.status(500).json({
            message: "Failed to create Razorpay order",
            error: error.response?.data?.message || error.message
        });
    }
}

export const verifyRazorpayPayment = async (req: AuthenticatedRequest, res: Response) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
    const isValid = verifyRazorpaySignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
    );
    if (!isValid) {
        return res.status(400).json({
            message: "Payment verification failed",
        });
    }
    const order = await fetchOrderForPayment(orderId);
    if (!ensureOrderBelongsToUser(order, req.user?._id)) {
        return res.status(403).json({
            message: "Forbidden",
        });
    }

    // “Payment service publishes a success event to RabbitMQ. The message stays in the queue until a consumer processes and acknowledges it
    await publishPaymentSuccess({
        orderId,
        paymentId: razorpay_payment_id,
        provider: "razorpay",
    });
    res.json({
        message: "Payment verified successfully"
    })
}

// working with stripe
import dotenv from "dotenv";
dotenv.config();
import Stripe from "stripe";
// stripe instance banana hoga
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
export const payWithStripe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.body;

    const order = await fetchOrderForPayment(orderId);
    if (!ensureOrderBelongsToUser(order, req.user?._id)) {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    const session = await stripe.checkout.sessions.create({
  payment_method_types: ["card"],
  mode: "payment",

  line_items: [
    {
      price_data: {
        currency: "inr",
        product_data: {
          name: "BhookBuster Food Order",
        },
        unit_amount: Math.round(order.amount * 100),
      },
      quantity: 1,
    },
  ],
  metadata:{
    orderId,
  },
  success_url: `${process.env.FRONTEND_URL}/ordersuccess/{CHECKOUT_SESSION_ID}`,
  cancel_url: `${process.env.FRONTEND_URL}/checkout`,
});
res.json({
  url: session.url,
});
  } catch (error: any) {
    console.error("❌ Stripe payment creation failed:", error.message || error);
    res.status(500).json({
      message: "stripe payment failed",
    });
  }
};


// check if the payment session id is valid or not and payment is successful or not
export const verifyStripe = async (req: AuthenticatedRequest, res: Response) => {
  const { sessionId } = req.body;

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return res.status(400).json({
        message: "Payment verification failed",
      });
    }

    if (session.payment_status !== "paid") {
      console.warn(`⚠️ Stripe verification failed for session ${sessionId}: Payment status is ${session.payment_status}`);
      return res.status(400).json({
        message: "Payment verification failed",
      });
    }

    const orderId = session.metadata?.orderId;

    if (!orderId) {
        return res.status(400).json({
            message:"OrderId not found int the stripe session "
        })
    }
    const order = await fetchOrderForPayment(orderId);
    if (!ensureOrderBelongsToUser(order, req.user?._id)) {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    if (session.amount_total !== Math.round(order.amount * 100) || session.currency !== order.currency.toLowerCase()) {
      return res.status(400).json({
        message: "Payment verification failed",
      });
    }

    await publishPaymentSuccess({
  orderId,
  paymentId: sessionId,
  provider: "stripe",
});

res.json({
  message: "payment successful",
});
}catch (error: any) {
    console.error(`❌ Stripe verification error for session ${sessionId}:`, error.message || error);
    res.status(500).json({
      message: "Stripe payment failed",
    });
  }
}
