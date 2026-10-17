import { Consent } from "../models/consent.model.js";
import { Exam } from "../models/exam.model.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";

// @desc    Record student consent before exam
// @route   POST /api/v1/exams/:id/consent
// @access  Private (Student)
export const recordConsent = async (req, res, next) => {
  try {
    const examId = req.params.id;
    const { accepted = true, monitoringOptions = {}, policyVersion = "1.0.0" } = req.body;

    const exam = await Exam.findById(examId);
    if (!exam) return sendError(res, "Exam not found", 404);

    if (!accepted) {
      return sendError(
        res,
        "Proctoring consent is required to participate in this monitored examination.",
        400
      );
    }

    const consent = await Consent.findOneAndUpdate(
      { studentId: req.user._id, examId },
      {
        studentId: req.user._id,
        examId,
        policyVersion,
        accepted: true,
        acceptedAt: new Date(),
        monitoringOptions: {
          faceMonitoring: monitoringOptions.faceMonitoring ?? true,
          phoneDetection: monitoringOptions.phoneDetection ?? true,
          tabMonitoring: monitoringOptions.tabMonitoring ?? true,
          snapshots: monitoringOptions.snapshots ?? true,
        },
      },
      { upsert: true, new: true }
    );

    return sendSuccess(res, "Monitoring consent registered", consent);
  } catch (error) {
    next(error);
  }
};

// @desc    Check student consent for an exam
// @route   GET /api/v1/exams/:id/consent
// @access  Private (Student)
export const getConsent = async (req, res, next) => {
  try {
    const examId = req.params.id;
    const consent = await Consent.findOne({
      studentId: req.user._id,
      examId,
    });

    return sendSuccess(res, "Consent record retrieved", {
      hasConsented: !!consent && consent.accepted,
      consent,
    });
  } catch (error) {
    next(error);
  }
};
