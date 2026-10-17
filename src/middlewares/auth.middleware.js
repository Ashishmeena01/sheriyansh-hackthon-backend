import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { sendError } from "../utils/apiResponse.js";

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
      return sendError(res, "Access denied. No token provided.", 401);
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "hackathon_default_secret_fallback_key"
    );

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return sendError(res, "Invalid token: user no longer exists", 401);
    }

    req.user = user;
    next();
  } catch (error) {
    return sendError(res, "Invalid or expired token", 401, error.message);
  }
};
