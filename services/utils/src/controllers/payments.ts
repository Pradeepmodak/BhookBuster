import { Request, Response } from "express";
import axios from "axios";
import { razorpay } from "../config/razorpay.js"
import { verifyRazorpaySignature } from "../config/verifyRazorpay.js";
import { publishPaymentSuccess } from "../config/payment.producer.js";

export const createRazorpayOrder = async (req: Request, res: Response) => {
    const { orderId } = req.body;
    // calling another microservice
    const { data } = await axios.get(
        `${process.env.RESTAURANT_SERVICE}/api/order/payment/${orderId}`,
        {
            // to get only trusted users // api key approach
            headers: {
                "x-internal-key": process.env.RESTAURANT_SERVICE
            }
        }
    );

    const razorpayOrder = await razorpay.orders.create({
        amount: data.amount * 100,
        currency: "INR",
        receipt: orderId,
    });
    res.json({
        razorpayOrderId: razorpayOrder.id,
        key: process.env.RAZORPAY_KEY_ID
    });
}

export const verifyRazorpayPayment = async (req: Request, res: Response) => {
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