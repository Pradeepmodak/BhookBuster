import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import restaurantRoutes from './routes/restaurant.js';
import cors from 'cors';
import itemRoutes from "./routes/menuitem.js"
import cartRoutes from "./routes/cartitem.js"
import addressRoutes from "./routes/address.js"
import orderRoutes from "./routes/order.js"
import searchRoutes from "./routes/search.js"
import recommendationRoutes from "./routes/recommendations.js"
import analyticsRoutes from "./routes/analytics.js"
import { connectRabbitMQ } from './config/rabbitmq.js';
import { startPaymentConsumer } from './config/payment.consumer.js';
import { startRecommendationsConsumer } from './consumers/recommendations.consumer.js';
import { corsOptions } from './config/cors.js';
import eventRoutes from "./routes/events.js"
import { connectRedis } from './cache/redis.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { performanceLogger } from './middlewares/performanceLogger.js';

dotenv.config();

// Pause THIS function until promise resolves
await connectDB();
await connectRedis();
await connectRabbitMQ();
startPaymentConsumer();
startRecommendationsConsumer();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors(corsOptions));
app.use(express.json());
app.use(performanceLogger);

import { restaurantGlobalLimiter } from './middlewares/rateLimit.js';
app.use(restaurantGlobalLimiter);

app.use("/api/restaurant",restaurantRoutes);
app.use("/api/item",itemRoutes);
app.use("/api/cart",cartRoutes);
app.use("/api/address",addressRoutes);
app.use("/api/order",orderRoutes);
app.use("/api/search",searchRoutes);
app.use("/api/events",eventRoutes);
app.use("/api/recommendations",recommendationRoutes);
app.use("/api/analytics",analyticsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Restaurant service is running on port ${PORT}`);
});
