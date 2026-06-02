import express from "express";
import { parseSearchQuery } from "../lib/gemini.js";

const router = express.Router();

router.post("/internal/nlp/parse", async (req: any, res: any) => {
  try {
    const { query } = req.body as {
      query?: unknown;
    };

    if (typeof query !== "string" || !query.trim()) {
      return res.status(400).json({ message: "query is required and must be a string" });
    }

    const nlpResult = await parseSearchQuery(query);
    return res.json(nlpResult);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;
