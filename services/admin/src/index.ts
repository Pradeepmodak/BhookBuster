import express from "express";
import dotenv from "dotenv";
import adminRoutes from "./routes/admin.js";
import cors from "cors";
import { connectDb } from "./config/db.js";
dotenv.config();

await connectDb();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/v1/api", adminRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Admin Service is running on port ${process.env.PORT}`);
});