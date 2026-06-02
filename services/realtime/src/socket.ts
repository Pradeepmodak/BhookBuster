import { Server } from "socket.io"
//to handle websocket connections and events
import http from "http"
// websocket connections are established over HTTP, so we need the http module to create a server that can handle both HTTP requests and WebSocket connections
import jwt from "jsonwebtoken"
// verify users identity and manage authentication for WebSocket connections
import { getAllowedOrigins } from "./config/cors.js";


let io: Server;

// Initialize Socket.IO server middleware for authentication
export const initSocket = (server: http.Server) => {
  io= new Server(server, {
    cors: {
      origin: getAllowedOrigins(),
      credentials: true,
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

  if (user.role === "admin") {
    socket.join("admin");
  }

  console.log(`User connected: ${userId}`);
  console.log("Socket room: ", [...socket.rooms]);

  socket.on("join-room", (room) => {
    if (room) {
      socket.join(room);
      console.log(`User ${userId} joined room: ${room}`);
    }
  });

  socket.on("leave-room", (room) => {
    if (room) {
      socket.leave(room);
      console.log(`User ${userId} left room: ${room}`);
    }
  });

  socket.on("rider:location", (data) => {
    if (data && data.room && data.payload) {
      socket.to(data.room).emit("rider:location", data.payload);
    }
  });

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
