import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import http from "http";
import { initSocket } from "./socket.js";
import internalRoutes from "./routes/internal.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";

dotenv.config();

const app = express();
app.use(cors());
// parses incoming requests with JSON payloads and is based on body-parser
app.use(express.json());
app.use("/api/v1/internal",internalRoutes);
app.use(notFoundHandler);
app.use(errorHandler);
const server = http.createServer(app);
initSocket(server);

server.listen(process.env.PORT, () => {
  console.log(`Realtime service is running port ${process.env.PORT}`);
});
