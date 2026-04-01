import express from 'express'
import dotenv from 'dotenv'
import connectDB from './config/db.js';
import authRoute from './routes/auth.js'
import cors from 'cors';
dotenv.config();
await connectDB();
const app=express();
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
  next();
});
app.use(cors({
  origin: "http://localhost:5173", // your frontend URL
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());
app.use("/api/auth",authRoute);
const PORT=process.env.PORT || 5000;

app.listen(PORT,()=>{
    console.log(`Auth service is running on port ${PORT}`);
    // connectDB();
}) 
