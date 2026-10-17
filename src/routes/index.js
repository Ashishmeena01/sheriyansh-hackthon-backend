import express from "express";
import authRoutes from "./auth.routes.js";
import { sendSuccess } from "../utils/apiResponse.js";
import mongoose from "mongoose";

const router = express.Router();

// Health Check route
router.get("/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  return sendSuccess(res, "Backend is healthy and running smoothly 🚀", {
    status: "ok",
    database: dbStatus,
    uptime: `${Math.floor(process.uptime())} seconds`,
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
router.use("/auth", authRoutes);

// NOTE: Once hackathon topic is assigned, add new route groups here:
// router.use("/products", productRoutes);
// router.use("/posts", postRoutes);

export default router;
