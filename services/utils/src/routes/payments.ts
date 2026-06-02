import express from "express";
import {
  createRazorpayOrder,
  payWithStripe,
  verifyRazorpayPayment,
  verifyStripe,
} from "../controllers/payments.js";
import { isAuth } from "../middlewares/isAuth.js";

const router = express.Router();
// create orders
router.post("/create", isAuth, createRazorpayOrder);
// verification to handle fake payments
router.post("/verify", isAuth, verifyRazorpayPayment);

// create stripe checkout session
router.post("/stripe/create", isAuth, payWithStripe);
router.post("/stripe/verify", isAuth, verifyStripe);

export default router;
