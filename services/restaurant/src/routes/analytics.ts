import express from "express";
import {
  askAnalytics,
  customersAnalytics,
  dishesAnalytics,
  insightsAnalytics,
  peakHoursAnalytics,
  platformAnalytics,
  revenueAnalytics,
} from "../controllers/analytics.js";
import { isAuth } from "../middlewares/isAuth.js";

const router = express.Router();

router.get("/revenue", isAuth, revenueAnalytics);
router.get("/dishes", isAuth, dishesAnalytics);
router.get("/peakhours", isAuth, peakHoursAnalytics);
router.get("/customers", isAuth, customersAnalytics);
router.get("/platform", isAuth, platformAnalytics);
router.get("/insights", isAuth, insightsAnalytics);
router.post("/ask", isAuth, askAnalytics);

export default router;

