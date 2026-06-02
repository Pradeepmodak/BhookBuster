import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import { homeRecommendations } from "../controllers/recommendations.js";

const router = express.Router();

router.get("/home", isAuth, homeRecommendations);

export default router;

