import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    noFaceThresholdSec: {
      type: Number,
      default: 5,
      min: 1,
      max: 30,
    },
    multipleFacesThresholdSec: {
      type: Number,
      default: 3,
      min: 1,
      max: 20,
    },
    lookingAwayThresholdSec: {
      type: Number,
      default: 5,
      min: 2,
      max: 30,
    },
    phoneConfidenceThreshold: {
      type: Number,
      default: 0.65,
      min: 0.3,
      max: 0.95,
    },
    eventCooldownSec: {
      type: Number,
      default: 10,
      min: 2,
      max: 60,
    },
    frameIntervalMs: {
      type: Number,
      default: 1000,
      min: 200,
      max: 5000,
    },
    enableSnapshots: {
      type: Boolean,
      default: true,
    },
    enableFaceMonitoring: {
      type: Boolean,
      default: true,
    },
    enablePhoneDetection: {
      type: Boolean,
      default: true,
    },
    enableTabMonitoring: {
      type: Boolean,
      default: true,
    },
    configVersion: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

export const MonitoringSettings = mongoose.model(
  "MonitoringSettings",
  settingsSchema
);
