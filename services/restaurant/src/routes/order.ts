import express from "express";
import { isAuth, isSeller } from "../middlewares/isAuth.js";
import { assignRiderToOrder, createOrder, fetchOrderForPayment, fetchRestaurantOrders, fetchSingleOrder, getAvailableOrdersForRider, getCurrentOrdersForRider, getMyOrders, updateOrderStatus, updateOrderStatusRider, getRiderEarningsAnalytics } from "../controllers/order.js";

const router = express.Router();

router.post("/new", isAuth, createOrder);
router.get("/my",isAuth,getMyOrders);
router.get("/payment/:id", fetchOrderForPayment);
router.put("/assign/rider", assignRiderToOrder);
router.get("/current/rider", getCurrentOrdersForRider);
router.get("/available/rider", getAvailableOrdersForRider);
router.get("/analytics/rider/:riderId", isAuth, getRiderEarningsAnalytics);
router.put("/update/status/rider/:orderId", updateOrderStatusRider);
router.get("/restaurant/:restaurantId", isAuth, isSeller, fetchRestaurantOrders);
router.put("/:orderId", isAuth, isSeller, updateOrderStatus);
router.get("/:id", isAuth, fetchSingleOrder);
export default router;
