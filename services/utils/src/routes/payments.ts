import express from "express";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "../controllers/payments.js";

const router = express.Router();
// create orders
router.post("/create", createRazorpayOrder);
// verification to handle fake payments
router.post("/verify", verifyRazorpayPayment);

export default router;