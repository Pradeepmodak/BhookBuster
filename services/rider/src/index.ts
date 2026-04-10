import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import cors from "cors";
import riderRoutes from "./routes/rider.js"
import { connectRabbitMQ } from "./config/rabbitmq.js";
import { startOrderReadyConsumer } from "./config/orderReady.consumer.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
dotenv.config();

await connectRabbitMQ();
await startOrderReadyConsumer();
await connectDB();

const app = express();
app.use(express.json());
app.use(cors());
app.use("/api/rider",riderRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(process.env.PORT, () => {
  console.log(`Rider service is running on port ${process.env.PORT}`);
});
