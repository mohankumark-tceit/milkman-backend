import express from "express";
import { verifyToken, authorizeRoles } from "../middlewares/auth.middleware.js";
import { sendCommunityRequest, fetchRequestsForMilkman, markRequestRead } from "../controllers/community.controller.js";

const router = express.Router();

// Customers (or any logged-in user) can send a request to a milkman by referral code
router.post("/request", verifyToken, sendCommunityRequest);

// Milkman can fetch their requests
router.get("/requests", verifyToken, authorizeRoles("milkman"), fetchRequestsForMilkman);

// Mark a request as read
router.put("/requests/:id/read", verifyToken, authorizeRoles("milkman"), markRequestRead);

export default router;
