import { Event } from "../models/event.model.js";
import { Attempt } from "../models/attempt.model.js";
import { Review } from "../models/review.model.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { emitToTeachers } from "../config/socket.js";
import { saveStudentSnapshot } from "../utils/storage.js";
import { calculateAttemptRiskScore } from "./attempt.controller.js";

// Valid event types
const VALID_EVENT_TYPES = [
  "NO_FACE",
  "MULTIPLE_FACES",
  "LOOKING_AWAY",
  "PHONE_DETECTED",
  "TAB_HIDDEN",
  "CAMERA_INTERRUPTED",
  "PROHIBITED_ACTION",
  "KEY_RESTRICTION",
];

// @desc    Record monitoring event with optional snapshot evidence
// @route   POST /api/v1/attempts/:id/events
// @access  Private (Student)
export const recordEvent = async (req, res, next) => {
  try {
    const attemptId = req.params.id;
    const {
      type,
      occurredAt = new Date(),
      durationMs = 0,
      confidence = 1.0,
      severity = "medium",
      metadata = {},
      snapshotBase64,
    } = req.body;

    if (!VALID_EVENT_TYPES.includes(type)) {
      return sendError(
        res,
        `Invalid event type. Allowed: ${VALID_EVENT_TYPES.join(", ")}`,
        400
      );
    }

    const attempt = await Attempt.findById(attemptId);
    if (!attempt) return sendError(res, "Attempt not found", 404);

    if (attempt.status !== "in_progress") {
      return sendError(res, "Attempt is not currently in progress", 400);
    }

    // Deduplication check: only throttle rapid heartbeats if no snapshot is attached
    if (!snapshotBase64) {
      const recentDuplicate = await Event.findOne({
        attemptId,
        type,
        occurredAt: { $gte: new Date(Date.now() - 3000) },
      });

      if (recentDuplicate) {
        return sendSuccess(res, "Event throttled (duplicate)", {
          event: recentDuplicate,
          throttled: true,
        });
      }
    }

    // Optional snapshot image stored in video/:studentId/allvideo/
    let evidenceUrl = "";
    if (snapshotBase64) {
      const saved = await saveStudentSnapshot(
        attempt.studentId,
        snapshotBase64,
        type.toLowerCase()
      );
      if (saved.success) {
        evidenceUrl = saved.relativeUrl;
      }
    }

    const event = await Event.create({
      attemptId,
      studentId: attempt.studentId,
      examId: attempt.examId,
      type,
      occurredAt,
      receivedAt: new Date(),
      durationMs,
      confidence: Math.min(1.0, Math.max(0.0, Number(confidence) || 1.0)),
      severity,
      metadata,
      evidenceUrl,
      isReviewed: false,
      reviewDecision: "pending",
    });

    // Recalculate attempt risk score
    const newRiskScore = await calculateAttemptRiskScore(attemptId);
    attempt.riskScore = newRiskScore;
    await attempt.save();

    // Populate for real-time notification
    const populatedEvent = await Event.findById(event._id)
      .populate("studentId", "name studentId email")
      .populate("examId", "title");

    emitToTeachers("event:flagged", {
      event: populatedEvent,
      newRiskScore,
      attemptId,
    });

    return sendSuccess(res, "Monitoring event recorded", {
      event,
      newRiskScore,
    }, 201);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all events for an attempt
// @route   GET /api/v1/attempts/:id/events
// @access  Private
export const getAttemptEvents = async (req, res, next) => {
  try {
    const attemptId = req.params.id;
    const events = await Event.find({ attemptId })
      .sort({ occurredAt: 1 })
      .populate("studentId", "name studentId email");

    return sendSuccess(res, "Events retrieved", events);
  } catch (error) {
    next(error);
  }
};

// @desc    Submit teacher review decision for an event (Valid vs False Alarm)
// @route   POST /api/v1/events/:id/reviews
// @access  Private (Teacher, Admin)
export const reviewEvent = async (req, res, next) => {
  try {
    const eventId = req.params.id;
    const { decision, notes = "" } = req.body;

    if (!["valid", "false_alarm"].includes(decision)) {
      return sendError(
        res,
        "Review decision must be either 'valid' or 'false_alarm'",
        400
      );
    }

    const event = await Event.findById(eventId);
    if (!event) return sendError(res, "Event not found", 404);

    // Save audit review record
    const review = await Review.create({
      eventId: event._id,
      attemptId: event.attemptId,
      reviewedBy: req.user._id,
      decision,
      notes: notes.trim(),
      reviewedAt: new Date(),
    });

    // Update event record
    event.isReviewed = true;
    event.reviewDecision = decision;
    await event.save();

    // Recalculate attempt risk score (false alarms are deducted!)
    const updatedRiskScore = await calculateAttemptRiskScore(event.attemptId);
    await Attempt.findByIdAndUpdate(event.attemptId, {
      riskScore: updatedRiskScore,
    });

    // Real-time broadcast
    emitToTeachers("event:reviewed", {
      eventId: event._id,
      attemptId: event.attemptId,
      decision,
      updatedRiskScore,
      reviewerName: req.user.name,
    });

    return sendSuccess(res, `Event marked as ${decision}`, {
      review,
      event,
      updatedRiskScore,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get reviews for an event
// @route   GET /api/v1/events/:id/reviews
// @access  Private (Teacher, Admin)
export const getEventReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ eventId: req.params.id })
      .populate("reviewedBy", "name email")
      .sort({ reviewedAt: -1 });

    return sendSuccess(res, "Reviews retrieved", reviews);
  } catch (error) {
    next(error);
  }
};
