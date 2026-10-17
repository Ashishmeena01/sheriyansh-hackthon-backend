import dotenv from "dotenv";
// Load environment variables immediately before any other imports
dotenv.config();

import app from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to Database
  await connectDB();

  // Start HTTP Server
  const server = app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 Hackathon Backend Server running in [${process.env.NODE_ENV || "development"}] mode`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🩺 Health check: http://localhost:${PORT}/api/v1/health`);
    console.log(`==================================================\n`);
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (err) => {
    console.error(`\x1b[31m[Unhandled Rejection]:\x1b[0m ${err.message}`);
    // In hackathons, keep the server running during rapid development
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
