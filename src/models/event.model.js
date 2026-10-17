import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    attemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attempt",
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "NO_FACE",
        "MULTIPLE_FACES",
        "LOOKING_AWAY",
        "PHONE_DETECTED",
        "TAB_HIDDEN",
        "CAMERA_INTERRUPTED",
      ],
      required: true,
    },
    occurredAt: {
      type: Date,
      default: Date.now,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 1.0,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    evidenceUrl: {
      type: String,
      default: "",
    },
    isReviewed: {
      type: Boolean,
      default: false,
    },
    reviewDecision: {
      type: String,
      enum: ["pending", "valid", "false_alarm"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

eventSchema.index({ attemptId: 1, occurredAt: -1 });

export const Event = mongoose.model("Event", eventSchema);
