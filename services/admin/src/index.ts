import express from "express";
import dotenv from "dotenv";
import adminRoutes from "./routes/admin.js";
import cors from "cors";
import { connectDb } from "./config/db.js";
import { connectRedis } from "./cache/redis.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { performanceLogger } from "./middlewares/performanceLogger.js";
dotenv.config();

await connectDb();
await connectRedis();

const app = express();
app.use(cors());
app.use(express.json());
app.use(performanceLogger);
app.use("/v1/api", adminRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(process.env.PORT, () => {
  console.log(`Admin Service is running on port ${process.env.PORT}`);
});
