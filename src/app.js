import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import apiRoutes from "./routes/index.js";
import { notFoundHandler, errorHandler } from "./middlewares/error.middleware.js";
import { VIDEO_ROOT_DIR } from "./utils/storage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 1. Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  })
);

// 2. Logging
app.use(morgan("dev"));

// 3. CORS configuration (Hackathon friendly)
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((url) => url.trim())
  : ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// 4. Body Parsers with 10mb limit for webcam snapshot base64 payloads
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// 5. Serve video & snapshots static folder (video/:studentId/allvideo/...)
app.use("/video", express.static(VIDEO_ROOT_DIR));

// 6. Root status endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    name: "ProctorVision API Server",
    tagline: "Smarter Exams. Fairer Monitoring. Privacy by Design.",
    version: "1.0.0",
    endpoints: {
      health: "/api/v1/health",
      auth: "/api/v1/auth",
      exams: "/api/v1/exams",
      attempts: "/api/v1/attempts",
      events: "/api/v1/events",
      teacher: "/api/v1/teacher",
    },
  });
});

// 7. Mount API v1 router
app.use("/api/v1", apiRoutes);

// 8. 404 & Centralized Error Handler
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
