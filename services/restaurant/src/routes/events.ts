import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import { captureUserFoodEvent } from "../controllers/events.js";

const router = express.Router();

router.post("/", isAuth, captureUserFoodEvent);

export default router;

