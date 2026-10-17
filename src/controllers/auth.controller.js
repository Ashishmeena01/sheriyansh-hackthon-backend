import { User } from "../models/user.model.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";

// Helper to send token response & cookie
const sendTokenResponse = (user, statusCode, res, message) => {
  const token = user.generateAuthToken();

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  };

  res.cookie("token", token, cookieOptions);

  return sendSuccess(
    res,
    message,
    {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        institution: user.institution,
        studentId: user.studentId,
        department: user.department,
        semester: user.semester,
        avatar: user.avatar,
      },
      token,
    },
    statusCode
  );
};

// @desc    Register a new user (Student or Teacher)
// @route   POST /api/v1/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      role = "student",
      institution,
      studentId,
      department,
      semester,
      teacherCode,
    } = req.body;

    if (!name || !email || !password) {
      return sendError(res, "Please provide full name, email, and password", 400);
    }

    if (password.length < 6) {
      return sendError(res, "Password must be at least 6 characters long", 400);
    }

    // Role verification: If trying to register as teacher, enforce invitation code
    let assignedRole = "student";
    if (role === "teacher") {
      const validCode = process.env.TEACHER_INVITATION_CODE || "PROCTOR_TEACHER_2026";
      if (!teacherCode || teacherCode.trim() !== validCode) {
        return sendError(
          res,
          "Invalid Teacher Invitation Code. Only authorized educators can create teacher accounts.",
          403
        );
      }
      assignedRole = "teacher";
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return sendError(res, "An account with this email already exists", 400);
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: assignedRole,
      institution: institution || "University / Institute",
      studentId: assignedRole === "student" ? (studentId || "") : "",
      department: department || "",
      semester: semester || "",
    });

    return sendTokenResponse(
      user,
      201,
      res,
      `${assignedRole.charAt(0).toUpperCase() + assignedRole.slice(1)} account created successfully`
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, "Please provide email and password", 400);
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!user) {
      return sendError(res, "Invalid email or password", 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, "Invalid email or password", 401);
    }

    if (!user.isActive) {
      return sendError(res, "Your account has been deactivated. Contact administration.", 403);
    }

    return sendTokenResponse(user, 200, res, `Welcome back, ${user.name}!`);
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    return sendSuccess(res, "Profile fetched successfully", {
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user & clear cookie
// @route   POST /api/v1/auth/logout
// @access  Private
export const logout = async (req, res, next) => {
  try {
    res.cookie("token", "none", {
      expires: new Date(Date.now() + 5 * 1000),
      httpOnly: true,
    });

    return sendSuccess(res, "Logged out successfully", null);
  } catch (error) {
    next(error);
  }
};
