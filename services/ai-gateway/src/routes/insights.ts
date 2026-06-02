import express from "express";
import { generateInsights } from "../lib/gemini.js";

const router = express.Router();

router.post("/internal/insights", async (req: any, res: any) => {
  try {
    const { prompt, context } = req.body as {
      prompt?: unknown;
      context?: unknown;
    };

    if (typeof prompt !== "string" || !context || typeof context !== "object") {
      return res
        .status(400)
        .json({ message: "prompt and context object are required" });
    }

    const insights = await generateInsights(prompt, context as object);
    return res.json(insights);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;

