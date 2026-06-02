import express from "express";
import { isAdmin, isAuth } from "../middlewares/isAuth.js";
import {
  getPendingRestaurant,
  getPendingRiders,
  verifyRestaurant,
  verifyRider,
  getAdminStats,
  getOrdersTrend,
  getTopItems,
} from "../controllers/admin.js";


const router = express.Router();

import { RequestHandler } from "express";

router.get(
	"/admin/restaurant/pending",
	isAuth,
	isAdmin,
	getPendingRestaurant as RequestHandler
);
router.get(
	"/admin/rider/pending",
	isAuth,
	isAdmin,
	getPendingRiders as RequestHandler
);
router.patch(
	"/verify/rider/:id",
	isAuth,
	isAdmin,
	verifyRider as RequestHandler
);
router.patch(
	"/verify/restaurant/:id",
	isAuth,
	isAdmin,
	verifyRestaurant as RequestHandler
);

router.get(
	"/admin/stats",
	isAuth,
	isAdmin,
	getAdminStats as RequestHandler
);
router.get(
	"/admin/orders-trend",
	isAuth,
	isAdmin,
	getOrdersTrend as RequestHandler
);
router.get(
	"/admin/top-items",
	isAuth,
	isAdmin,
	getTopItems as RequestHandler
);

export default router;