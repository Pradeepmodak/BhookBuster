import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
dotenv.config();
connectDB();
const app = express();
const PORT = process.env.PORT || 3000;
app.listen(3000, () => {
  console.log('Restaurant service is running on port 3000');
});