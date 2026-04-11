import express from 'express';
import { isAuth ,isSeller} from '../middlewares/isAuth.js';
import { addRestaurant, fetchMyRestaurant, fetchSingleRestaurant, getNearbyRestaurant, getRestaurantAnalytics, updateRestaurant, updateRestaurantImage, updateStatusRestaurant } from '../controllers/restaurant.js';
import uploadFile from '../middlewares/multer.js';


const router =express.Router();

router.post("/new",isAuth,isSeller,uploadFile,addRestaurant);
router.get("/my",isAuth,isSeller,fetchMyRestaurant);
router.put("/status",isAuth,isSeller,updateStatusRestaurant);
router.put("/edit",isAuth,isSeller,updateRestaurant);
router.put("/image/update", isAuth, isSeller, uploadFile, updateRestaurantImage);
router.get("/analytics/:id", isAuth, isSeller, getRestaurantAnalytics);
router.get("/all",isAuth,getNearbyRestaurant);
router.get("/:id",isAuth,fetchSingleRestaurant);
export default router;
