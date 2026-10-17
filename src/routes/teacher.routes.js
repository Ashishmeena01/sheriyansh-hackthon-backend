import express from "express";
import {
  getTeacherDashboard,
  getTeacherAttempts,
  getTeacherReviews,
  getMonitoringSettings,
  updateMonitoringSettings,
} from "../controllers/teacher.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(protect);
router.use(authorize("teacher", "admin"));

router.get("/dashboard", getTeacherDashboard);
router.get("/attempts", getTeacherAttempts);
router.get("/reviews", getTeacherReviews);

router.route("/monitoring-settings")
  .get(getMonitoringSettings)
  .patch(updateMonitoringSettings);

export default router;
