import express from 'express';
import dotenv from 'dotenv';
import authRoute from './routes/auth.js';
dotenv.config();
const app = express();
app.use("/api/auth", authRoute);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Auth service is running on port ${PORT}`);
    // connectDB();
});
