import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { initSocket } from "./config/socket.js";
import { ensureStudentVideoDir } from "./utils/storage.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Ensure base video directory is initialized
  ensureStudentVideoDir("default");

  // Connect to MongoDB
  await connectDB();

  // Create HTTP server wrapping express app
  const httpServer = http.createServer(app);

  // Initialize Socket.IO
  initSocket(httpServer);

  // Start HTTP Server
  const server = httpServer.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 ProctorVision Backend Server running in [${process.env.NODE_ENV || "development"}] mode`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🩺 Health check: http://localhost:${PORT}/api/v1/health`);
    console.log(`⚡ Socket.IO real-time telemetry active`);
    console.log(`📸 Video Snapshot Archive: /video/:studentId/allvideo/`);
    console.log(`🤖 Claude AI Model: ${process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022"}`);
    console.log(`==================================================\n`);
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (err) => {
    console.error(`\x1b[31m[Unhandled Rejection]:\x1b[0m ${err.message}`);
  });

  // Handle uncaught exceptions
  process.on("uncaughtException", (err) => {
    console.error(`\x1b[31m[Uncaught Exception]:\x1b[0m ${err.message}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log("\nClosing server gracefully...");
    server.close(() => {
      console.log("Server closed.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
};

startServer();
