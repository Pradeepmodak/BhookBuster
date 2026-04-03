import express from "express";
import { isAuth, isSeller } from "../middlewares/isAuth.js";
import { createOrder, fetchOrderForPayment, fetchRestaurantOrders, fetchSingleOrder, getMyOrders, updateOrderStatus } from "../controllers/order.js";

const router = express.Router();

router.post("/new", isAuth, createOrder);
router.get("/my",isAuth,getMyOrders);
router.get("/payment/:id", fetchOrderForPayment);
router.get("/restaurant/:restaurantId", isAuth, isSeller, fetchRestaurantOrders);
router.put("/:orderId", isAuth, isSeller, updateOrderStatus);
router.get("/:id", isAuth, fetchSingleOrder);
export default router;