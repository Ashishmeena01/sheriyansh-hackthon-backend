import mongoose from "mongoose";

const consentSchema = new mongoose.Schema(
  {
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
    policyVersion: {
      type: String,
      default: "1.0.0",
    },
    accepted: {
      type: Boolean,
      required: true,
      default: true,
    },
    acceptedAt: {
      type: Date,
      default: Date.now,
    },
    monitoringOptions: {
      faceMonitoring: { type: Boolean, default: true },
      phoneDetection: { type: Boolean, default: true },
      tabMonitoring: { type: Boolean, default: true },
      snapshots: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

export const Consent = mongoose.model("Consent", consentSchema);
