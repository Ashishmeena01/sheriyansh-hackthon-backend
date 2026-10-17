import { Server } from "socket.io";

let io = null;

export const initSocket = (httpServer) => {
  const allowedOrigins = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(",").map((url) => url.trim())
    : ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"];

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    // Join teacher channel
    socket.on("join:teacher", () => {
      socket.join("teacher-room");
    });

    // Join specific exam room
    socket.on("join:exam", (examId) => {
      if (examId) socket.join(`exam-${examId}`);
    });

    // Join specific student attempt room
    socket.on("join:attempt", (attemptId) => {
      if (attemptId) socket.join(`attempt-${attemptId}`);
    });

    socket.on("disconnect", () => {
      // Clean disconnect
    });
  });

  return io;
};

export const getIO = () => {
  return io;
};

// Notification emitters
export const emitToTeachers = (event, data) => {
  if (io) {
    io.to("teacher-room").emit(event, data);
  }
};

export const emitToExam = (examId, event, data) => {
  if (io && examId) {
    io.to(`exam-${examId}`).emit(event, data);
  }
};

export const emitToAttempt = (attemptId, event, data) => {
  if (io && attemptId) {
    io.to(`attempt-${attemptId}`).emit(event, data);
  }
};
