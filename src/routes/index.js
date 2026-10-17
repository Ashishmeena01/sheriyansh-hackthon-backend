import express from "express";
import authRoutes from "./auth.routes.js";
import examRoutes from "./exam.routes.js";
import attemptRoutes from "./attempt.routes.js";
import eventRoutes from "./event.routes.js";
import teacherRoutes from "./teacher.routes.js";
import { sendSuccess } from "../utils/apiResponse.js";
import mongoose from "mongoose";

const router = express.Router();

// Health Check route
router.get("/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  return sendSuccess(res, "ProctorVision Backend is healthy and running smoothly 🚀", {
    status: "ok",
    database: dbStatus,
    claudeAI: process.env.ANTHROPIC_API_KEY ? "active" : "rule-fallback-ready",
    uptime: `${Math.floor(process.uptime())} seconds`,
    timestamp: new Date().toISOString(),
  });
});

// Mount Resource Routes
router.use("/auth", authRoutes);
router.use("/exams", examRoutes);
router.use("/attempts", attemptRoutes);
router.use("/events", eventRoutes);
router.use("/teacher", teacherRoutes);

export default router;
