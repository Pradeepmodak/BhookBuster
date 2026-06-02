import express from "express";
import { rerankCandidates } from "../lib/gemini.js";

const router = express.Router();

router.post("/internal/rerank", async (req: any, res: any) => {
  try {
    const { query, candidates } = req.body as {
      query?: unknown;
      candidates?: unknown;
    };

    if (
      typeof query !== "string" ||
      !Array.isArray(candidates) ||
      candidates.some(
        (candidate) =>
          !candidate ||
          typeof candidate !== "object" ||
          typeof (candidate as { id?: unknown }).id !== "string" ||
          typeof (candidate as { text?: unknown }).text !== "string"
      )
    ) {
      return res
        .status(400)
        .json({ message: "query and candidates are required" });
    }

    const ranked = await rerankCandidates(
      query,
      candidates as { id: string; text: string }[]
    );
    return res.json(ranked);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;

