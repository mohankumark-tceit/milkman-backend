import express from "express";
import { verifyToken, authorizeRoles } from "../middlewares/auth.middleware.js";
import {
  setPricePerLitre,
  getMilkmanProfile,
  setPaymentDetails,
  createPaymentForCustomer,
  trackLocation,
} from "../controllers/milkman.controller.js";

const router = express.Router();

// Milkman: Set price per litre
router.post("/set-price", verifyToken, authorizeRoles("milkman"), setPricePerLitre);

// Milkman: Get profile
router.get("/profile", verifyToken, authorizeRoles("milkman"), getMilkmanProfile);

// Milkman: Set Razorpay payment details (key id & secret)
router.post("/payment-details", verifyToken, authorizeRoles("milkman"), setPaymentDetails);

// Milkman: Create payment order for a customer
router.post(
  "/create-payment-order",
  verifyToken,
  authorizeRoles("milkman"),
  createPaymentForCustomer
);

// Milkman: Send live location updates (upserts a single 'Live Location' announcement visible to customers)
router.post("/track", verifyToken, authorizeRoles("milkman"), trackLocation);

export default router;
