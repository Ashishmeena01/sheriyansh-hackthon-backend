import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: [true, "Question text is required"],
      trim: true,
    },
    options: {
      type: [String],
      required: [true, "At least two options are required"],
      validate: [
        (val) => val.length >= 2,
        "Question must have at least 2 options",
      ],
    },
    correctOptionIndex: {
      type: Number,
      required: [true, "Correct option index is required"],
    },
    marks: {
      type: Number,
      default: 1,
      min: [1, "Marks must be at least 1"],
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: true }
);

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Exam title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    instructions: {
      type: String,
      default:
        "Ensure your webcam is enabled and stay in the exam tab during the entire test duration. Multiple faces or cell phones in view will be flagged for teacher review.",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    durationMinutes: {
      type: Number,
      required: [true, "Duration in minutes is required"],
      min: [1, "Duration must be at least 1 minute"],
      default: 30,
    },
    startAt: {
      type: Date,
      default: Date.now,
    },
    endAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days ahead
    },
    status: {
      type: String,
      enum: ["draft", "published", "completed", "archived"],
      default: "draft",
    },
    questions: [questionSchema],
    totalMarks: {
      type: Number,
      default: 0,
    },
    passingMarks: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 1,
    },
    allowedStudentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    settings: {
      faceMonitoring: { type: Boolean, default: true },
      phoneDetection: { type: Boolean, default: true },
      tabMonitoring: { type: Boolean, default: true },
      captureSnapshots: { type: Boolean, default: true },
      noFaceThresholdSec: { type: Number, default: 5 },
      multipleFacesThresholdSec: { type: Number, default: 3 },
      lookingAwayThresholdSec: { type: Number, default: 5 },
      phoneConfidenceThreshold: { type: Number, default: 0.65 },
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to calculate total marks
examSchema.pre("save", function () {
  if (this.questions && this.questions.length > 0) {
    this.totalMarks = this.questions.reduce((sum, q) => sum + (q.marks || 1), 0);
    if (!this.passingMarks) {
      this.passingMarks = Math.ceil(this.totalMarks * 0.4);
    }
  }
});

export const Exam = mongoose.model("Exam", examSchema);
