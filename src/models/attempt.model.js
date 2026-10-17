import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    selectedOptionIndex: {
      type: Number,
      required: true,
    },
    savedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const attemptSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    attemptNumber: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ["scheduled", "in_progress", "submitted", "auto_submitted", "expired"],
      default: "in_progress",
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    deadlineAt: {
      type: Date,
      required: true,
    },
    submittedAt: {
      type: Date,
    },
    answers: [answerSchema],
    score: {
      type: Number,
      default: 0,
    },
    totalMarks: {
      type: Number,
      default: 0,
    },
    monitoringStatus: {
      type: String,
      enum: ["not_started", "active", "interrupted", "ended"],
      default: "active",
    },
    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    aiAnalysis: {
      summary: { type: String, default: "" },
      riskLevel: { type: String, enum: ["low", "medium", "high", ""], default: "" },
      recommendation: { type: String, default: "" },
      keyConcerns: [String],
      analyzedAt: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

// Index to prevent duplicate active attempts
attemptSchema.index({ examId: 1, studentId: 1, attemptNumber: 1 }, { unique: true });

export const Attempt = mongoose.model("Attempt", attemptSchema);
