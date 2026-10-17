import { Exam } from "../models/exam.model.js";
import { Attempt } from "../models/attempt.model.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";

// @desc    Create a new Exam (Teacher only)
// @route   POST /api/v1/exams
// @access  Private (Teacher, Admin)
export const createExam = async (req, res, next) => {
  try {
    const {
      title,
      description,
      instructions,
      durationMinutes,
      startAt,
      endAt,
      questions = [],
      maxAttempts = 1,
      settings = {},
    } = req.body;

    if (!title) {
      return sendError(res, "Exam title is required", 400);
    }

    if (!durationMinutes || durationMinutes < 1) {
      return sendError(res, "Valid duration in minutes is required", 400);
    }

    // Validate questions structure
    if (questions.length > 0) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.questionText || !q.options || q.options.length < 2) {
          return sendError(
            res,
            `Question #${i + 1} must have valid text and at least 2 options`,
            400
          );
        }
        if (
          q.correctOptionIndex === undefined ||
          q.correctOptionIndex < 0 ||
          q.correctOptionIndex >= q.options.length
        ) {
          return sendError(
            res,
            `Question #${i + 1} must have a valid correctOptionIndex matching one of the options`,
            400
          );
        }
      }
    }

    const exam = await Exam.create({
      title,
      description,
      instructions,
      durationMinutes,
      startAt: startAt || new Date(),
      endAt: endAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      questions,
      maxAttempts,
      settings,
      createdBy: req.user._id,
      status: "draft",
    });

    return sendSuccess(res, "Exam created successfully as draft", exam, 201);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all exams (Teacher gets their exams, Student gets published active exams)
// @route   GET /api/v1/exams
// @access  Private
export const getExams = async (req, res, next) => {
  try {
    const isTeacher = req.user.role === "teacher" || req.user.role === "admin";

    if (isTeacher) {
      const exams = await Exam.find({ createdBy: req.user._id })
        .sort({ createdAt: -1 })
        .populate("createdBy", "name email institution");

      // Attach attempt counts for each exam
      const examsWithStats = await Promise.all(
        exams.map(async (exam) => {
          const attemptCount = await Attempt.countDocuments({ examId: exam._id });
          const activeCount = await Attempt.countDocuments({
            examId: exam._id,
            status: "in_progress",
          });
          return {
            ...exam.toObject(),
            stats: { totalAttempts: attemptCount, activeAttempts: activeCount },
          };
        })
      );

      return sendSuccess(res, "Exams retrieved successfully", examsWithStats);
    }

    // Student view: Only published exams
    const exams = await Exam.find({
      status: "published",
      // End date either in future or null
      $or: [{ endAt: { $gte: new Date() } }, { endAt: null }],
    })
      .select("-questions.correctOptionIndex") // NEVER expose answer key to student
      .sort({ createdAt: -1 })
      .populate("createdBy", "name institution");

    // Check student's prior attempts
    const examsWithAttemptStatus = await Promise.all(
      exams.map(async (exam) => {
        const studentAttempts = await Attempt.find({
          examId: exam._id,
          studentId: req.user._id,
        }).select("attemptNumber status score totalMarks startedAt submittedAt");

        const hasActiveAttempt = studentAttempts.some(
          (a) => a.status === "in_progress"
        );
        const activeAttempt = studentAttempts.find(
          (a) => a.status === "in_progress"
        );

        return {
          ...exam.toObject(),
          studentAttempts,
          canAttempt: studentAttempts.length < exam.maxAttempts,
          hasActiveAttempt,
          activeAttemptId: activeAttempt ? activeAttempt._id : null,
        };
      })
    );

    return sendSuccess(
      res,
      "Available exams retrieved successfully",
      examsWithAttemptStatus
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Get single exam details
// @route   GET /api/v1/exams/:id
// @access  Private
export const getExamById = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id).populate(
      "createdBy",
      "name email institution"
    );

    if (!exam) {
      return sendError(res, "Exam not found", 404);
    }

    const isTeacher = req.user.role === "teacher" || req.user.role === "admin";
    const isOwner = isTeacher && exam.createdBy._id.toString() === req.user._id.toString();

    // If student or non-owner, strip correct options!
    if (!isOwner) {
      if (exam.status !== "published") {
        return sendError(res, "This exam is not available or unpublished", 403);
      }
      const sanitizedExam = exam.toObject();
      sanitizedExam.questions = sanitizedExam.questions.map((q) => {
        const { correctOptionIndex, ...rest } = q;
        return rest;
      });
      return sendSuccess(res, "Exam details retrieved", sanitizedExam);
    }

    return sendSuccess(res, "Exam details retrieved with answer keys", exam);
  } catch (error) {
    next(error);
  }
};

// @desc    Update an Exam
// @route   PATCH /api/v1/exams/:id
// @access  Private (Teacher, Owner only)
export const updateExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return sendError(res, "Exam not found", 404);
    }

    if (exam.createdBy.toString() !== req.user._id.toString()) {
      return sendError(res, "Unauthorized: You can only edit your own exams", 403);
    }

    const updates = req.body;
    Object.assign(exam, updates);
    await exam.save();

    return sendSuccess(res, "Exam updated successfully", exam);
  } catch (error) {
    next(error);
  }
};

// @desc    Publish an exam
// @route   POST /api/v1/exams/:id/publish
// @access  Private (Teacher, Owner only)
export const publishExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return sendError(res, "Exam not found", 404);

    if (exam.createdBy.toString() !== req.user._id.toString()) {
      return sendError(res, "Unauthorized: You can only publish your own exams", 403);
    }

    if (!exam.questions || exam.questions.length === 0) {
      return sendError(res, "Cannot publish an exam without any questions", 400);
    }

    exam.status = "published";
    await exam.save();

    return sendSuccess(res, "Exam published successfully! Students can now access it.", exam);
  } catch (error) {
    next(error);
  }
};

// @desc    Archive an exam
// @route   POST /api/v1/exams/:id/archive
// @access  Private (Teacher, Owner only)
export const archiveExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return sendError(res, "Exam not found", 404);

    if (exam.createdBy.toString() !== req.user._id.toString()) {
      return sendError(res, "Unauthorized: You can only archive your own exams", 403);
    }

    exam.status = "archived";
    await exam.save();

    return sendSuccess(res, "Exam archived", exam);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an exam
// @route   DELETE /api/v1/exams/:id
// @access  Private (Teacher, Owner only)
export const deleteExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return sendError(res, "Exam not found", 404);

    if (exam.createdBy.toString() !== req.user._id.toString()) {
      return sendError(res, "Unauthorized: You can only delete your own exams", 403);
    }

    await Exam.findByIdAndDelete(req.params.id);
    return sendSuccess(res, "Exam deleted successfully", null);
  } catch (error) {
    next(error);
  }
};
