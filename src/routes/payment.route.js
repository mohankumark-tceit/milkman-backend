import express from "express";
import { verifyToken, authorizeRoles } from "../middlewares/auth.middleware.js";
import {
  createPaymentOrder,
  verifyPayment,
  getPaymentHistory,
} from "../controllers/payment.controller.js";

const router = express.Router();

// Customer: Create payment order
router.post(
  "/create-order",
  verifyToken,
  authorizeRoles("customer"),
  createPaymentOrder
);

// Verify payment after Razorpay (customers or milkmen can submit verification)
router.post("/verify", verifyToken, authorizeRoles("customer", "milkman"), verifyPayment);

// Customer: Get payment history
router.get("/history", verifyToken, authorizeRoles("customer"), getPaymentHistory);

export default router;
