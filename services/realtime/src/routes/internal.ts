import express from "express"
import { getIO } from "../socket.js"
import { AppError } from "../middlewares/errorHandler.js";

const router = express.Router()

router.post("/emit", (req, res, next) => {
try {
if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
  throw new AppError("Forbidden", 403);
}
const { event, room, payload } = req.body;

if (!event || !room) {
  throw new AppError("event and room are required", 400);
}

const io = getIO();

console.log(`📶 Emitting event ${event} to room ${room}`);

io.to(room).emit(event, payload ?? {});

return res.json({ success: true });
} catch (error) {
  next(error);
}
});

export default router;
