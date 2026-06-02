import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import cors from "cors";
import riderRoutes from "./routes/rider.js"
import { connectRabbitMQ } from "./config/rabbitmq.js";
import { startOrderReadyConsumer } from "./config/orderReady.consumer.js";
import { corsOptions } from "./config/cors.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { connectRedis } from "./cache/redis.js";
import { performanceLogger } from "./middlewares/performanceLogger.js";

dotenv.config();

await connectRabbitMQ();
await startOrderReadyConsumer();
await connectDB();
await connectRedis();

const app = express();
app.use(express.json());
app.use(cors(corsOptions));
app.use(performanceLogger);

app.use("/api/rider",riderRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(process.env.PORT, () => {
  console.log(`Rider service is running on port ${process.env.PORT}`);
});
