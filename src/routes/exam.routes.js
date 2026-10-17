import express from "express";
import {
  createExam,
  getExams,
  getExamById,
  updateExam,
  publishExam,
  archiveExam,
  deleteExam,
} from "../controllers/exam.controller.js";
import {
  startExamAttempt,
} from "../controllers/attempt.controller.js";
import {
  recordConsent,
  getConsent,
} from "../controllers/consent.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Publicly protected routes (any authenticated user)
router.use(protect);

router.route("/")
  .get(getExams)
  .post(authorize("teacher", "admin"), createExam);

router.route("/:id")
  .get(getExamById)
  .patch(authorize("teacher", "admin"), updateExam)
  .delete(authorize("teacher", "admin"), deleteExam);

// Teacher Exam Actions
router.post("/:id/publish", authorize("teacher", "admin"), publishExam);
router.post("/:id/archive", authorize("teacher", "admin"), archiveExam);

// Student Exam Actions
router.post("/:id/consent", recordConsent);
router.get("/:id/consent", getConsent);
router.post("/:id/start", startExamAttempt);

export default router;
