import express from 'express'
import dotenv from 'dotenv'
import connectDB from './config/db.js';
import authRoute from './routes/auth.js'
import cors from 'cors';
import { corsOptions } from './config/cors.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

dotenv.config();
await connectDB();

const app=express();

app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
  next();
});

app.use(cors(corsOptions));
app.use(express.json());

app.use("/api/auth",authRoute);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT=process.env.PORT || 5000;

app.listen(PORT,()=>{
    console.log(`Auth service is running on port ${PORT}`);
}) 
