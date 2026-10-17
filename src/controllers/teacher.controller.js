import { Exam } from "../models/exam.model.js";
import { Attempt } from "../models/attempt.model.js";
import { Event } from "../models/event.model.js";
import { Review } from "../models/review.model.js";
import { MonitoringSettings } from "../models/settings.model.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";

// @desc    Get Teacher Dashboard Analytics & Overview
// @route   GET /api/v1/teacher/dashboard
// @access  Private (Teacher, Admin)
export const getTeacherDashboard = async (req, res, next) => {
  try {
    const teacherId = req.user._id;

    // 1. Get all exams created by this teacher
    const exams = await Exam.find({ createdBy: teacherId }).select("_id title status createdAt");
    const examIds = exams.map((e) => e._id);

    // 2. Aggregate statistics
    const totalExams = exams.length;
    const publishedExams = exams.filter((e) => e.status === "published").length;

    const activeAttempts = await Attempt.countDocuments({
      examId: { $in: examIds },
      status: "in_progress",
    });

    const completedAttempts = await Attempt.countDocuments({
      examId: { $in: examIds },
      status: { $in: ["submitted", "auto_submitted"] },
    });

    const eventsAwaitingReview = await Event.countDocuments({
      examId: { $in: examIds },
      isReviewed: false,
    });

    const totalEvents = await Event.countDocuments({
      examId: { $in: examIds },
    });

    const falseAlarmEvents = await Event.countDocuments({
      examId: { $in: examIds },
      reviewDecision: "false_alarm",
    });

    // 3. Event distribution by type (for Recharts)
    const eventDistribution = await Event.aggregate([
      { $match: { examId: { $in: examIds } } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);

    // 4. Live active students
    const liveSessions = await Attempt.find({
      examId: { $in: examIds },
      status: "in_progress",
    })
      .populate("studentId", "name email studentId institution")
      .populate("examId", "title durationMinutes")
      .sort({ startedAt: -1 })
      .limit(10);

    // 5. Recent flagged events
    const recentEvents = await Event.find({
      examId: { $in: examIds },
    })
      .populate("studentId", "name studentId")
      .populate("examId", "title")
      .sort({ occurredAt: -1 })
      .limit(10);

    return sendSuccess(res, "Teacher dashboard loaded", {
      stats: {
        totalExams,
        publishedExams,
        activeAttempts,
        completedAttempts,
        eventsAwaitingReview,
        totalEvents,
        falseAlarmEvents,
        reviewedEvents: totalEvents - eventsAwaitingReview,
      },
      eventDistribution: eventDistribution.map((item) => ({
        type: item._id,
        count: item.count,
      })),
      liveSessions,
      recentEvents,
      recentExams: exams.slice(0, 5),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all student attempts with filter & search
// @route   GET /api/v1/teacher/attempts
// @access  Private (Teacher, Admin)
export const getTeacherAttempts = async (req, res, next) => {
  try {
    const teacherId = req.user._id;
    const { status, examId, search, riskLevel } = req.query;

    const exams = await Exam.find({ createdBy: teacherId }).select("_id");
    const examIds = exams.map((e) => e._id);

    const query = { examId: { $in: examIds } };

    if (status) query.status = status;
    if (examId) query.examId = examId;

    let attempts = await Attempt.find(query)
      .populate("studentId", "name email studentId institution department")
      .populate("examId", "title durationMinutes totalMarks")
      .sort({ startedAt: -1 });

    // Client-side text search by student name or roll number if requested
    if (search) {
      const q = search.toLowerCase();
      attempts = attempts.filter(
        (a) =>
          a.studentId?.name?.toLowerCase().includes(q) ||
          a.studentId?.studentId?.toLowerCase().includes(q) ||
          a.studentId?.email?.toLowerCase().includes(q)
      );
    }

    // Filter by riskLevel if requested
    if (riskLevel === "high") {
      attempts = attempts.filter((a) => a.riskScore >= 60);
    } else if (riskLevel === "medium") {
      attempts = attempts.filter((a) => a.riskScore >= 30 && a.riskScore < 60);
    } else if (riskLevel === "low") {
      attempts = attempts.filter((a) => a.riskScore < 30);
    }

    return sendSuccess(res, "Attempts retrieved", attempts);
  } catch (error) {
    next(error);
  }
};

// @desc    Get events review queue with snapshot evidence
// @route   GET /api/v1/teacher/reviews
// @access  Private (Teacher, Admin)
export const getTeacherReviews = async (req, res, next) => {
  try {
    const teacherId = req.user._id;
    const { status = "all", examId } = req.query;

    const exams = await Exam.find({ createdBy: teacherId }).select("_id");
    const examIds = exams.map((e) => e._id);

    const query = { examId: { $in: examIds } };
    if (examId) query.examId = examId;
    if (status === "pending") query.isReviewed = false;
    if (status === "valid") query.reviewDecision = "valid";
    if (status === "false_alarm") query.reviewDecision = "false_alarm";

    const events = await Event.find(query)
      .populate("studentId", "name email studentId institution department")
      .populate("examId", "title durationMinutes")
      .populate("attemptId", "startedAt submittedAt riskScore status")
      .sort({ occurredAt: -1 });

    return sendSuccess(res, "Review events retrieved", events);
  } catch (error) {
    next(error);
  }
};

// @desc    Get False-Alarm Tuning Settings & Analytics
// @route   GET /api/v1/teacher/monitoring-settings
// @access  Private (Teacher, Admin)
export const getMonitoringSettings = async (req, res, next) => {
  try {
    let settings = await MonitoringSettings.findOne({ teacherId: req.user._id });

    if (!settings) {
      settings = await MonitoringSettings.create({ teacherId: req.user._id });
    }

    // Compute false-alarm analytics
    const exams = await Exam.find({ createdBy: req.user._id }).select("_id");
    const examIds = exams.map((e) => e._id);

    const totalEvents = await Event.countDocuments({ examId: { $in: examIds } });
    const reviewedEvents = await Event.countDocuments({
      examId: { $in: examIds },
      isReviewed: true,
    });
    const falseAlarms = await Event.countDocuments({
      examId: { $in: examIds },
      reviewDecision: "false_alarm",
    });

    const falseAlarmRate =
      reviewedEvents > 0 ? Math.round((falseAlarms / reviewedEvents) * 100) : 0;

    return sendSuccess(res, "Monitoring settings retrieved", {
      settings,
      analytics: {
        totalEvents,
        reviewedEvents,
        falseAlarms,
        falseAlarmRate,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update False-Alarm Tuning Settings
// @route   PATCH /api/v1/teacher/monitoring-settings
// @access  Private (Teacher, Admin)
export const updateMonitoringSettings = async (req, res, next) => {
  try {
    let settings = await MonitoringSettings.findOne({ teacherId: req.user._id });
    if (!settings) {
      settings = new MonitoringSettings({ teacherId: req.user._id });
    }

    Object.assign(settings, req.body);
    settings.configVersion = (settings.configVersion || 1) + 1;
    await settings.save();

    return sendSuccess(res, "Monitoring settings updated successfully", settings);
  } catch (error) {
    next(error);
  }
};
