import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import apiRoutes from "./routes/index.js";
import { notFoundHandler, errorHandler } from "./middlewares/error.middleware.js";

const app = express();

// 1. Enable Morgan logging in development
app.use(morgan("dev"));

// 2. CORS configuration (Hackathon friendly: supports localhost, credentials & tunnels)
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((url) => url.trim())
  : ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // For fast hackathon development, allow localhost origins dynamically
      if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive for hackathon
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// 3. Body parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// 4. Welcome route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Sheryians Hackathon Backend API Server is Live! 🚀",
    version: "1.0.0",
    endpoints: {
      health: "/api/v1/health",
      auth: {
        register: "POST /api/v1/auth/register",
        login: "POST /api/v1/auth/login",
        me: "GET /api/v1/auth/me",
        logout: "POST /api/v1/auth/logout",
      },
    },
  });
});

// 5. Mount API v1 router
app.use("/api/v1", apiRoutes);

// 6. 404 Handler & Global Error Handler
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
