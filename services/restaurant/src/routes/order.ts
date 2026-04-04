import express from "express";
import { isAuth, isSeller } from "../middlewares/isAuth.js";
import { assignRiderToOrder, createOrder, fetchOrderForPayment, fetchRestaurantOrders, fetchSingleOrder, getCurrentOrdersForRider, getMyOrders, updateOrderStatus, updateOrderStatusRider } from "../controllers/order.js";

const router = express.Router();

router.post("/new", isAuth, createOrder);
router.get("/my",isAuth,getMyOrders);
router.get("/payment/:id", fetchOrderForPayment);
router.get("/restaurant/:restaurantId", isAuth, isSeller, fetchRestaurantOrders);
router.put("/:orderId", isAuth, isSeller, updateOrderStatus);
router.get("/:id", isAuth, fetchSingleOrder);
// Assign order
router.put("/assign/rider", assignRiderToOrder);
// View current order
router.get("/current/rider", getCurrentOrdersForRider);
// Update delivery status
router.put("/update/status/rider", updateOrderStatusRider);
export default router;