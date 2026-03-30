import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import restaurantRoutes from './routes/restaurant.js';
import cors from 'cors';
import itemRoutes from "./routes/menuitem.js"
import cartRoutes from "./routes/cartitem.js"
import addressRoutes from "./routes/address.js"
dotenv.config();
connectDB();
const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
app.use("/api/restaurant",restaurantRoutes);
app.use("/api/item",itemRoutes);
app.use("/api/cart",cartRoutes);
app.use("/api/address",addressRoutes);
app.listen(PORT, () => {
  console.log(`Restaurant service is running on port ${PORT}`);
  connectDB();
});