import { Server } from "socket.io"
//to handle websocket connections and events
import http from "http"
// websocket connections are established over HTTP, so we need the http module to create a server that can handle both HTTP requests and WebSocket connections
import jwt from "jsonwebtoken"
// verify users identity and manage authentication for WebSocket connections


let io: Server;

// Initialize Socket.IO server middleware for authentication
export const initSocket = (server: http.Server) => {
  io= new Server(server, {
    cors: {
      origin: "*",
    },
  });
  io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Unauthorized"));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY!) as any;
   
    if(!decoded || !decoded.user || !decoded.user._id) {
      return next(new Error("Unauthorized"));
    }

    socket.data.user = decoded.user;
    next();
  } catch (error) {
      console.log("❌ Socket auth failed:", error);
      next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  const user = socket.data.user;

  if (!user) {
    socket.disconnect();
    return;
  }

  const userId=user._id;
  socket.join(`user:${userId}`);

if (user.restaurantId) {
  socket.join(`restaurant:${user.restaurantId}`);
}

console.log(`User connected: ${userId}`);
console.log("Socket room: ", [...socket.rooms]);

socket.on("disconnect", () => {
  console.log(`User disconnected: ${userId}`);
});
});
return io;
}

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }

  return io;
};