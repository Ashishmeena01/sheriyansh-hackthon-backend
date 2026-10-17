import express from "express";
import {
  getMyAttempts,
  getAttempt,
  saveAnswer,
  submitAttempt,
  uploadAttemptSnapshot,
  runAIAnalysis,
} from "../controllers/attempt.controller.js";
import {
  recordEvent,
  getAttemptEvents,
} from "../controllers/event.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.get("/my", getMyAttempts);
router.get("/:id", getAttempt);
router.put("/:id/answers/:questionId", saveAnswer);
router.post("/:id/submit", submitAttempt);
router.post("/:id/snapshot", uploadAttemptSnapshot);
router.post("/:id/ai-analysis", authorize("teacher", "admin"), runAIAnalysis);

// Event telemetry routes nested on attempt
router.route("/:id/events")
  .post(recordEvent)
  .get(getAttemptEvents);

export default router;
