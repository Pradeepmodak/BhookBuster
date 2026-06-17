import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import { semanticSearch, restaurantSemanticSearch } from "../controllers/search.js";

const router = express.Router();

router.post("/semantic", isAuth, semanticSearch);
router.post("/restaurants", isAuth, restaurantSemanticSearch);

export default router;

