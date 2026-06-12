import dotenv from "dotenv";
import express from "express";
import { serviceAuth, RawBodyRequest } from "./middleware/serviceAuth.js";
import embedRoutes from "./routes/embed.js";
import insightsRoutes from "./routes/insights.js";
import rerankRoutes from "./routes/rerank.js";
import nlpRoutes from "./routes/nlp.js";

dotenv.config();

export const app = express();

app.get("/health", (_req: any, res: any) => {
  res.json({ status: "ok", service: "ai-gateway" });
});

// Rate limit removed: AI gateway is an internal service protected by serviceAuth. 
// Rate limiting by IP here blocks the entire restaurant service since all requests come from the same proxy/server IP.

app.use(
  express.json({
    limit: "1mb",
    verify: (req: RawBodyRequest, _res: any, buffer: Buffer) => {
      req.rawBody = Buffer.from(buffer);
    },
  })
);

app.use(serviceAuth);
app.use(embedRoutes);
app.use(insightsRoutes);
app.use(rerankRoutes);
app.use(nlpRoutes);

if (process.env.NODE_ENV !== "test") {
  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => {
    console.log(`AI gateway is running on port ${PORT}`);
  });
}
