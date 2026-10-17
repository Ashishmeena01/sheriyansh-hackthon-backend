import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Exam } from "../models/exam.model.js";
import { Attempt } from "../models/attempt.model.js";
import { Event } from "../models/event.model.js";
import { Review } from "../models/review.model.js";
import { MonitoringSettings } from "../models/settings.model.js";
import { saveStudentSnapshot } from "../utils/storage.js";

// Minimal 1x1 transparent/grey base64 image sample for initial seed evidence
const DUMMY_SNAPSHOT_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const seedDatabase = async () => {
  try {
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sheriyans_hackathon";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB for seeding...");

    // 1. Clean existing records for fresh demo state
    await User.deleteMany({ email: { $in: ["teacher@proctorvision.com", "rahul@proctorvision.com", "priya@proctorvision.com"] } });
    console.log("Cleaned prior seed users.");

    // 2. Create Teacher
    const teacher = await User.create({
      name: "Dr. Arvind Sharma",
      email: "teacher@proctorvision.com",
      password: "Teacher@123",
      role: "teacher",
      institution: "Sheryians Institute of Technology",
      department: "Computer Science & Engineering",
    });

    // 3. Create Students
    const student1 = await User.create({
      name: "Rahul Verma",
      email: "rahul@proctorvision.com",
      password: "Student@123",
      role: "student",
      studentId: "CS2026-042",
      institution: "Sheryians Institute of Technology",
      department: "CSE",
      semester: "6th",
    });

    const student2 = await User.create({
      name: "Priya Patel",
      email: "priya@proctorvision.com",
      password: "Student@123",
      role: "student",
      studentId: "CS2026-088",
      institution: "Sheryians Institute of Technology",
      department: "CSE",
      semester: "6th",
    });

    console.log("Created demo accounts:");
    console.log("  Teacher: teacher@proctorvision.com / Teacher@123");
    console.log("  Student: rahul@proctorvision.com / Student@123");
    console.log("  Student: priya@proctorvision.com / Student@123");

    // 4. Create Monitoring Settings
    await MonitoringSettings.findOneAndUpdate(
      { teacherId: teacher._id },
      {
        teacherId: teacher._id,
        noFaceThresholdSec: 5,
        multipleFacesThresholdSec: 3,
        lookingAwayThresholdSec: 5,
        phoneConfidenceThreshold: 0.65,
        enableSnapshots: true,
      },
      { upsert: true }
    );

    // 5. Create Published Exam with MCQs
    const exam = await Exam.create({
      title: "CS302: Data Structures & Algorithms Midterm Exam",
      description:
        "Comprehensive assessment covering Time Complexity, Binary Search Trees, Graphs, and Dynamic Programming.",
      instructions:
        "1. Keep your webcam centered at all times.\n2. Do not navigate away from this browser tab.\n3. Ensure your room is well lit and no other person is present.\n4. Mobile phones and secondary screens are strictly forbidden.",
      createdBy: teacher._id,
      durationMinutes: 20,
      startAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: "published",
      maxAttempts: 2,
      settings: {
        faceMonitoring: true,
        phoneDetection: true,
        tabMonitoring: true,
        captureSnapshots: true,
        noFaceThresholdSec: 5,
        multipleFacesThresholdSec: 3,
        lookingAwayThresholdSec: 5,
        phoneConfidenceThreshold: 0.65,
      },
      questions: [
        {
          questionText: "What is the worst-case time complexity of searching in an unbalanced Binary Search Tree (BST)?",
          options: ["O(log n)", "O(n)", "O(n log n)", "O(1)"],
          correctOptionIndex: 1, // O(n)
          marks: 2,
          order: 1,
        },
        {
          questionText: "Which data structure is primarily used in Breadth-First Search (BFS) traversal of a graph?",
          options: ["Stack", "Queue", "Priority Queue", "Linked List"],
          correctOptionIndex: 1, // Queue
          marks: 2,
          order: 2,
        },
        {
          questionText: "What is the auxiliary space complexity of standard Merge Sort algorithm on an array of size n?",
          options: ["O(1)", "O(log n)", "O(n)", "O(n^2)"],
          correctOptionIndex: 2, // O(n)
          marks: 2,
          order: 3,
        },
        {
          questionText: "Which algorithm finds the shortest path in a weighted graph with non-negative edge weights?",
          options: ["Bellman-Ford", "Dijkstra's Algorithm", "Floyd-Warshall", "Prim's Algorithm"],
          correctOptionIndex: 1, // Dijkstra's
          marks: 2,
          order: 4,
        },
        {
          questionText: "In dynamic programming, what is the core property that allows solving subproblems only once?",
          options: ["Greedy Choice", "Optimal Substructure & Overlapping Subproblems", "Divide and Conquer", "Backtracking"],
          correctOptionIndex: 1,
          marks: 2,
          order: 5,
        },
      ],
    });

    console.log(`Created Exam: "${exam.title}" (ID: ${exam._id})`);

    // 6. Save a dummy snapshot for Priya's attempt
    const snap1 = await saveStudentSnapshot(student2._id, DUMMY_SNAPSHOT_BASE64, "phone_detected");
    const snap2 = await saveStudentSnapshot(student2._id, DUMMY_SNAPSHOT_BASE64, "looking_away");

    // 7. Create Completed Attempt for Priya with flagged events for review demonstration
    const priyaAttempt = await Attempt.create({
      examId: exam._id,
      studentId: student2._id,
      attemptNumber: 1,
      status: "submitted",
      startedAt: new Date(Date.now() - 40 * 60 * 1000),
      deadlineAt: new Date(Date.now() - 20 * 60 * 1000),
      submittedAt: new Date(Date.now() - 22 * 60 * 1000),
      answers: [
        { questionId: exam.questions[0]._id, selectedOptionIndex: 1 },
        { questionId: exam.questions[1]._id, selectedOptionIndex: 1 },
        { questionId: exam.questions[2]._id, selectedOptionIndex: 2 },
        { questionId: exam.questions[3]._id, selectedOptionIndex: 1 },
        { questionId: exam.questions[4]._id, selectedOptionIndex: 0 },
      ],
      score: 8,
      totalMarks: 10,
      riskScore: 35,
      monitoringStatus: "ended",
      aiAnalysis: {
        summary: "Priya Patel completed the exam with high academic score (8/10). Telemetry captured a potential cell phone reflection and two brief gaze deviations.",
        riskLevel: "medium",
        recommendation: "Review snapshot for phone event at 12:25. If benign reflection, dismiss as false alarm.",
        keyConcerns: ["1 instance of possible mobile device detected", "Brief gaze shifts recorded"],
        analyzedAt: new Date(),
      },
    });

    // 8. Create Flagged Events for Priya
    const ev1 = await Event.create({
      attemptId: priyaAttempt._id,
      studentId: student2._id,
      examId: exam._id,
      type: "PHONE_DETECTED",
      occurredAt: new Date(Date.now() - 35 * 60 * 1000),
      durationMs: 4200,
      confidence: 0.78,
      severity: "high",
      metadata: { detectionClass: "cell phone", boundingBox: [120, 80, 240, 310] },
      evidenceUrl: snap1.relativeUrl,
      isReviewed: false,
      reviewDecision: "pending",
    });

    const ev2 = await Event.create({
      attemptId: priyaAttempt._id,
      studentId: student2._id,
      examId: exam._id,
      type: "LOOKING_AWAY",
      occurredAt: new Date(Date.now() - 30 * 60 * 1000),
      durationMs: 6500,
      confidence: 0.92,
      severity: "medium",
      metadata: { yawAngle: -34, pitchAngle: -12 },
      evidenceUrl: snap2.relativeUrl,
      isReviewed: true,
      reviewDecision: "false_alarm",
    });

    await Review.create({
      eventId: ev2._id,
      attemptId: priyaAttempt._id,
      reviewedBy: teacher._id,
      decision: "false_alarm",
      notes: "Student was glancing at a paper rough sheet beside keyboard.",
      reviewedAt: new Date(Date.now() - 10 * 60 * 1000),
    });

    console.log("Demo seed complete! Database populated with realistic records.");
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
};

seedDatabase();
