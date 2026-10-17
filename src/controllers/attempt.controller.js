import { Attempt } from "../models/attempt.model.js";
import { Exam } from "../models/exam.model.js";
import { Event } from "../models/event.model.js";
import { Consent } from "../models/consent.model.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { emitToTeachers, emitToAttempt } from "../config/socket.js";
import { saveStudentSnapshot } from "../utils/storage.js";
import { analyzeAttemptWithClaude } from "../services/ai.service.js";

// Helper: Calculate risk score from events excluding false alarms
export const calculateAttemptRiskScore = async (attemptId) => {
  const events = await Event.find({
    attemptId,
    reviewDecision: { $ne: "false_alarm" },
  });

  const weights = {
    NO_FACE: 10,
    MULTIPLE_FACES: 20,
    LOOKING_AWAY: 5,
    PHONE_DETECTED: 25,
    TAB_HIDDEN: 10,
    CAMERA_INTERRUPTED: 15,
  };

  let rawScore = 0;
  for (const ev of events) {
    rawScore += weights[ev.type] || 5;
  }

  // Normalize to 0-100
  return Math.min(100, rawScore);
};

// @desc    Start an exam attempt
// @route   POST /api/v1/exams/:id/start
// @access  Private (Student)
export const startExamAttempt = async (req, res, next) => {
  try {
    const examId = req.params.id;
    const studentId = req.user._id;

    const exam = await Exam.findById(examId);
    if (!exam) return sendError(res, "Exam not found", 404);

    if (exam.status !== "published") {
      return sendError(res, "This exam is not currently active or published", 403);
    }

    // Check if student has an existing in-progress attempt
    let activeAttempt = await Attempt.findOne({
      examId,
      studentId,
      status: "in_progress",
    });

    if (activeAttempt) {
      // Check if deadline has passed
      if (new Date() > activeAttempt.deadlineAt) {
        activeAttempt.status = "auto_submitted";
        activeAttempt.submittedAt = activeAttempt.deadlineAt;
        await activeAttempt.save();
      } else {
        const sanitizedExam = exam.toObject();
        sanitizedExam.questions = sanitizedExam.questions.map((q) => {
          const { correctOptionIndex, ...rest } = q;
          return rest;
        });

        return sendSuccess(res, "Resuming active exam attempt", {
          attempt: activeAttempt,
          exam: sanitizedExam,
          serverTime: new Date(),
          remainingSeconds: Math.max(
            0,
            Math.floor((activeAttempt.deadlineAt - Date.now()) / 1000)
          ),
        });
      }
    }

    // Check attempt limits
    const priorAttemptsCount = await Attempt.countDocuments({
      examId,
      studentId,
      status: { $in: ["submitted", "auto_submitted"] },
    });

    if (priorAttemptsCount >= exam.maxAttempts) {
      return sendError(
        res,
        `You have exceeded the maximum allowed attempts (${exam.maxAttempts}) for this exam`,
        400
      );
    }

    // Official server-controlled deadline
    const startedAt = new Date();
    const deadlineAt = new Date(startedAt.getTime() + exam.durationMinutes * 60 * 1000);

    const newAttempt = await Attempt.create({
      examId,
      studentId,
      attemptNumber: priorAttemptsCount + 1,
      startedAt,
      deadlineAt,
      status: "in_progress",
      monitoringStatus: "active",
      totalMarks: exam.totalMarks,
      answers: [],
    });

    // Notify teachers via Socket.IO
    emitToTeachers("attempt:started", {
      attemptId: newAttempt._id,
      examId: exam._id,
      examTitle: exam.title,
      student: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        studentId: req.user.studentId,
      },
      startedAt,
      deadlineAt,
    });

    const sanitizedExam = exam.toObject();
    sanitizedExam.questions = sanitizedExam.questions.map((q) => {
      const { correctOptionIndex, ...rest } = q;
      return rest;
    });

    return sendSuccess(
      res,
      "Exam session started successfully",
      {
        attempt: newAttempt,
        exam: sanitizedExam,
        serverTime: new Date(),
        remainingSeconds: exam.durationMinutes * 60,
      },
      201
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Get attempt details
// @route   GET /api/v1/attempts/:id
// @access  Private
export const getAttempt = async (req, res, next) => {
  try {
    const attempt = await Attempt.findById(req.params.id)
      .populate("examId")
      .populate("studentId", "name email studentId institution department");

    if (!attempt) return sendError(res, "Attempt not found", 404);

    const isStudent = req.user.role === "student";
    const isOwnerStudent = isStudent && attempt.studentId._id.toString() === req.user._id.toString();
    const isTeacher = req.user.role === "teacher" || req.user.role === "admin";

    if (!isOwnerStudent && !isTeacher) {
      return sendError(res, "Unauthorized to view this attempt", 403);
    }

    const exam = attempt.examId.toObject();
    // If student, strip correct answers unless exam is submitted and policy allows
    if (isStudent && attempt.status === "in_progress") {
      exam.questions = exam.questions.map((q) => {
        const { correctOptionIndex, ...rest } = q;
        return rest;
      });
    }

    const remainingSeconds = Math.max(
      0,
      Math.floor((attempt.deadlineAt - Date.now()) / 1000)
    );

    return sendSuccess(res, "Attempt retrieved", {
      attempt,
      exam,
      remainingSeconds,
      serverTime: new Date(),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save single answer
// @route   PUT /api/v1/attempts/:id/answers/:questionId
// @access  Private (Student)
export const saveAnswer = async (req, res, next) => {
  try {
    const { id: attemptId, questionId } = req.params;
    const { selectedOptionIndex } = req.body;

    const attempt = await Attempt.findById(attemptId);
    if (!attempt) return sendError(res, "Attempt not found", 404);

    if (attempt.studentId.toString() !== req.user._id.toString()) {
      return sendError(res, "Unauthorized", 403);
    }

    if (attempt.status !== "in_progress") {
      return sendError(res, "Cannot save answers: Attempt is no longer active", 400);
    }

    // 10 second grace buffer for network lag
    if (Date.now() > attempt.deadlineAt.getTime() + 10000) {
      attempt.status = "auto_submitted";
      attempt.submittedAt = attempt.deadlineAt;
      await attempt.save();
      return sendError(res, "Exam deadline has elapsed. Attempt auto-submitted.", 400);
    }

    const answerIndex = attempt.answers.findIndex(
      (a) => a.questionId.toString() === questionId
    );

    if (answerIndex > -1) {
      attempt.answers[answerIndex].selectedOptionIndex = selectedOptionIndex;
      attempt.answers[answerIndex].savedAt = new Date();
    } else {
      attempt.answers.push({
        questionId,
        selectedOptionIndex,
        savedAt: new Date(),
      });
    }

    await attempt.save();

    return sendSuccess(res, "Answer saved", {
      savedCount: attempt.answers.length,
      questionId,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit attempt
// @route   POST /api/v1/attempts/:id/submit
// @access  Private (Student)
export const submitAttempt = async (req, res, next) => {
  try {
    const attempt = await Attempt.findById(req.params.id)
      .populate("examId")
      .populate("studentId", "name email studentId");

    if (!attempt) return sendError(res, "Attempt not found", 404);

    if (attempt.studentId._id.toString() !== req.user._id.toString()) {
      return sendError(res, "Unauthorized", 403);
    }

    if (attempt.status !== "in_progress") {
      return sendSuccess(res, "Attempt is already submitted", { attempt });
    }

    const exam = attempt.examId;
    let calculatedScore = 0;

    // Grade answers against correctOptionIndex
    const answerMap = new Map();
    for (const a of attempt.answers) {
      answerMap.set(a.questionId.toString(), a.selectedOptionIndex);
    }

    for (const q of exam.questions) {
      const selected = answerMap.get(q._id.toString());
      if (selected !== undefined && selected === q.correctOptionIndex) {
        calculatedScore += q.marks || 1;
      }
    }

    // Compute updated risk score
    const finalRiskScore = await calculateAttemptRiskScore(attempt._id);

    const { autoSubmitted, reason } = req.body || {};
    attempt.status = autoSubmitted ? "auto_submitted" : "submitted";
    attempt.submittedAt = new Date();
    attempt.score = calculatedScore;
    attempt.totalMarks = exam.totalMarks;
    attempt.riskScore = finalRiskScore;
    attempt.monitoringStatus = "ended";

    await attempt.save();

    // Notify teachers via Socket.IO
    emitToTeachers("attempt:submitted", {
      attemptId: attempt._id,
      examId: exam._id,
      examTitle: exam.title,
      student: attempt.studentId,
      score: calculatedScore,
      totalMarks: exam.totalMarks,
      riskScore: finalRiskScore,
      submittedAt: attempt.submittedAt,
    });

    return sendSuccess(res, "Exam submitted successfully", {
      attemptId: attempt._id,
      score: calculatedScore,
      totalMarks: exam.totalMarks,
      submittedAt: attempt.submittedAt,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload snapshot image to video/:studentId/allvideo/
// @route   POST /api/v1/attempts/:id/snapshot
// @access  Private (Student)
export const uploadAttemptSnapshot = async (req, res, next) => {
  try {
    const { imageBase64, eventType = "telemetry_snapshot" } = req.body;
    const attempt = await Attempt.findById(req.params.id);

    if (!attempt) return sendError(res, "Attempt not found", 404);
    if (!imageBase64) return sendError(res, "No image data provided", 400);

    const saved = await saveStudentSnapshot(attempt.studentId, imageBase64, eventType);
    if (!saved.success) {
      return sendError(res, "Failed to save snapshot", 500, saved.error);
    }

    return sendSuccess(res, "Snapshot stored in video archive", {
      relativeUrl: saved.relativeUrl,
      filename: saved.filename,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Run Claude 3.5 Sonnet AI Review on attempt
// @route   POST /api/v1/attempts/:id/ai-analysis
// @access  Private (Teacher, Admin)
export const runAIAnalysis = async (req, res, next) => {
  try {
    const attempt = await Attempt.findById(req.params.id)
      .populate("examId")
      .populate("studentId", "name email studentId");

    if (!attempt) return sendError(res, "Attempt not found", 404);

    const events = await Event.find({ attemptId: attempt._id }).sort({ occurredAt: 1 });

    const analysis = await analyzeAttemptWithClaude({
      examTitle: attempt.examId.title,
      studentName: attempt.studentId.name,
      durationMinutes: attempt.examId.durationMinutes,
      events,
      riskScore: attempt.riskScore,
    });

    attempt.aiAnalysis = {
      summary: analysis.summary,
      riskLevel: analysis.riskLevel,
      recommendation: analysis.recommendation,
      keyConcerns: analysis.keyConcerns,
      analyzedAt: new Date(),
    };

    await attempt.save();

    return sendSuccess(res, "Claude AI evaluation completed", {
      aiAnalysis: attempt.aiAnalysis,
      provider: analysis.provider,
    });
  } catch (error) {
    next(error);
  }
};
