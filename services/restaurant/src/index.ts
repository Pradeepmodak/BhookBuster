import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import restaurantRoutes from './routes/restaurant.js';
dotenv.config();
connectDB();
const app = express();
const PORT = process.env.PORT || 3000;

app.use("/api/restaurant",restaurantRoutes)

app.listen(PORT, () => {
  console.log(`Restaurant service is running on port ${PORT}`);
  connectDB();
});