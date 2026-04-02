import express from "express";
import {
  createRazorpayOrder,
  payWithStripe,
  verifyRazorpayPayment,
  verifyStripe,
} from "../controllers/payments.js";

const router = express.Router();
// create orders
router.post("/create", createRazorpayOrder);
// verification to handle fake payments
router.post("/verify", verifyRazorpayPayment);

// create stripe checkout session
router.post("/stripe/create",payWithStripe);
router.post("/stripe/verify",verifyStripe);

export default router;