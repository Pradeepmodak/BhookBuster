import express from "express"
import { isAuth } from "../middlewares/isAuth.js";
import { acceptOrder, addRiderProfile, fetchMyCurrentOrder, fetchMyProfile, fetchDeliveryQueue, toggleRiderAvailability, updateOrderStatus, updateRiderProfile } from "../controllers/rider.js";
import uploadFile from "../middlewares/multer.js";

const router=express.Router();

router.get("/myprofile",isAuth,fetchMyProfile);
router.patch("/toggle",isAuth,toggleRiderAvailability);
router.post("/new",isAuth,uploadFile,addRiderProfile);
router.post("/accept/:orderId", isAuth, acceptOrder);
router.get("/order/current", isAuth, fetchMyCurrentOrder);
router.get("/order/queue", isAuth, fetchDeliveryQueue);
router.put("/order/update/:orderId",isAuth,updateOrderStatus);
// Update profile details
router.put("/profile/update", isAuth, uploadFile, updateRiderProfile);

export default router;
