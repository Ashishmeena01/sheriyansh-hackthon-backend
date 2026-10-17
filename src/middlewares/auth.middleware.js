import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { sendError } from "../utils/apiResponse.js";
import rateLimit from "express-rate-limit";

// Rate limiting for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: {
    success: false,
    message: "Too many login/register attempts from this IP. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Protect routes - JWT verification
export const protect = async (req, res, next) => {
  try {
    let token = null;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return sendError(res, "Access denied. Please log in to proceed.", 401);
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "hackathon_default_secret_fallback_key"
    );

    const user = await User.findById(decoded.id).select("-password");
    if (!user || !user.isActive) {
      return sendError(res, "Invalid token or account is deactivated", 401);
    }

    req.user = user;
    next();
  } catch (error) {
    return sendError(res, "Invalid or expired session token", 401, error.message);
  }
};

// Role-based authorization
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendError(
        res,
        `Forbidden: Role '${req.user?.role}' is not authorized to access this resource`,
        403
      );
    }
    next();
  };
};
