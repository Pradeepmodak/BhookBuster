/**
 * @fileoverview Payment Routes
 * @description Express router for handling payment processing and verification using Razorpay and Stripe.
 * All routes in this file require user authentication.
 */
import express from "express";
import {
  createRazorpayOrder,
  payWithStripe,
  verifyRazorpayPayment,
  verifyStripe,
} from "../controllers/payments.js";
import { isAuth } from "../middlewares/isAuth.js";

const router = express.Router();

/**
 * @route POST /create
 * @description Create a new Razorpay order
 * @access Private (Requires authentication)
 */
router.post("/create", isAuth, createRazorpayOrder);

/**
 * @route POST /verify
 * @description Verify a Razorpay payment signature
 * @access Private (Requires authentication)
 */
router.post("/verify", isAuth, verifyRazorpayPayment);

/**
 * @route POST /stripe/create
 * @description Create a new Stripe checkout session
 * @access Private (Requires authentication)
 */
router.post("/stripe/create", isAuth, payWithStripe);

/**
 * @route POST /stripe/verify
 * @description Verify a Stripe payment
 * @access Private (Requires authentication)
 */
router.post("/stripe/verify", isAuth, verifyStripe);

export default router;
