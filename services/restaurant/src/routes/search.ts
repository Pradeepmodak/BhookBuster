import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import { semanticSearch } from "../controllers/search.js";

const router = express.Router();

router.post("/semantic", isAuth, semanticSearch);

export default router;

