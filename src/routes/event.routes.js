import express from "express";
import {
  reviewEvent,
  getEventReviews,
} from "../controllers/event.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.route("/:id/reviews")
  .post(authorize("teacher", "admin"), reviewEvent)
  .get(authorize("teacher", "admin"), getEventReviews);

export default router;
