import express from "express";
import { embedTexts } from "../lib/gemini.js";

const router = express.Router();

router.post("/internal/embed", async (req: any, res: any) => {
  try {
    const { texts, taskType } = req.body as {
      texts?: unknown;
      taskType?: string;
    };

    if (!Array.isArray(texts) || texts.some((text) => typeof text !== "string")) {
      return res.status(400).json({ message: "texts must be a string array" });
    }

    const embeddings = await embedTexts(texts, taskType || "RETRIEVAL_DOCUMENT");
    return res.json({ embeddings });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;

