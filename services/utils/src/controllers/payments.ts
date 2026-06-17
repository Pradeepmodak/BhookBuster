/**
 * @fileoverview Payment Controllers
 * @description Handles payment order creation and verification for Razorpay and Stripe.
 */
// Type definition for Express Response object, used for typing controller responses
import { Response } from "express";
// Promise-based HTTP client for making API requests to other microservices (like Restaurant Service)
import axios from "axios";
// Instantiated Razorpay SDK client used to interact with Razorpay's API (e.g., creating orders)
import { razorpay } from "../config/razorpay.js"
// Utility function to cryptographically verify the authenticity of Razorpay webhooks/callbacks
import { verifyRazorpaySignature } from "../config/verifyRazorpay.js";
// Message broker (RabbitMQ) producer to emit events asynchronously when a payment succeeds
import { publishPaymentSuccess } from "../config/payment.producer.js";
// Custom TypeScript interface extending Express Request to include the authenticated user's details
import { AuthenticatedRequest } from "../middlewares/isAuth.js";

type OrderForPayment = {
  orderId: string;
  amount: number;
  currency: string;
  userId: string;
};

/**
 * Fetches the order details required for payment processing from the Restaurant Service.
 * @param {string} orderId - The unique identifier of the order.
 * @returns {Promise<OrderForPayment>} The order data.
 */
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

/**
 * Validates whether a given order belongs to the currently authenticated user.
 * @param {OrderForPayment} order - The order to check.
 * @param {string | undefined} userId - The ID of the authenticated user.
 * @returns {boolean} True if the order belongs to the user, false otherwise.
 */
const ensureOrderBelongsToUser = (
  order: OrderForPayment,
  userId: string | undefined
) => {
  if (!userId || order.userId !== userId) {
    return false;
  }

  return true;
};

/**
 * Controller to create a new Razorpay order.
 * Fetches order details, verifies ownership, and creates an order on Razorpay.
 * @param {AuthenticatedRequest} req - The Express request object.
 * @param {Response} res - The Express response object.
 */
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

/**
 * Controller to verify a Razorpay payment signature.
 * If valid, publishes a payment success event to the message broker.
 * @param {AuthenticatedRequest} req - The Express request object.
 * @param {Response} res - The Express response object.
 */
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
// Loads environment variables from a .env file into process.env
import dotenv from "dotenv";
dotenv.config();
// Stripe Node.js SDK for interacting with the Stripe API (e.g., creating checkout sessions)
import Stripe from "stripe";
// stripe instance banana hoga
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
/**
 * Controller to create a Stripe checkout session.
 * @param {AuthenticatedRequest} req - The Express request object.
 * @param {Response} res - The Express response object.
 */
export const payWithStripe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.body;

    const order = await fetchOrderForPayment(orderId);
    if (!ensureOrderBelongsToUser(order, req.user?._id)) {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    if (!process.env.FRONTEND_URL) {
      console.error("❌ FRONTEND_URL is missing in environment variables");
      return res.status(500).json({ message: "Server configuration error: FRONTEND_URL missing" });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("❌ STRIPE_SECRET_KEY is missing in environment variables");
      return res.status(500).json({ message: "Server configuration error: STRIPE_SECRET_KEY missing" });
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
      metadata: {
        orderId,
      },
      success_url: `${process.env.FRONTEND_URL}/ordersuccess/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/checkout`,
    });
    res.json({
      url: session.url,
    });
  } catch (error: any) {
    console.error("❌ Stripe payment creation failed:", error.response?.data || error.message || error);
    res.status(500).json({
      message: "stripe payment failed",
      error: error.message
    });
  }
};


// check if the payment session id is valid or not and payment is successful or not
/**
 * Controller to verify a Stripe checkout session.
 * Checks the payment status and amount, then publishes a success event if valid.
 * @param {AuthenticatedRequest} req - The Express request object.
 * @param {Response} res - The Express response object.
 */
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
        message: "OrderId not found in the stripe session "
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
  } catch (error: any) {
    console.error(`❌ Stripe verification error for session ${sessionId}:`, error.message || error);
    res.status(500).json({
      message: "Stripe payment failed",
    });
  }
}
