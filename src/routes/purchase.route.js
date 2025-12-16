import express from "express";
import { verifyToken, authorizeRoles } from "../middlewares/auth.middleware.js";
import {
  addDailyPurchase,
  getCustomerPurchases,
  getMilkmanCustomerPurchases,
  markPurchasePaid,
} from "../controllers/purchase.controller.js";

const router = express.Router();

// Customer: Add/update daily purchase
router.post("/add", verifyToken, authorizeRoles("customer"), addDailyPurchase);

// Customer: Get their purchase history
router.get("/my-purchases", verifyToken, authorizeRoles("customer"), getCustomerPurchases);

// Milkman: Get all customer purchases
router.get(
  "/milkman-customers",
  verifyToken,
  authorizeRoles("milkman"),
  getMilkmanCustomerPurchases
);

// Milkman: Mark purchase as paid (via payment verification)
router.put("/:purchaseId/paid", verifyToken, authorizeRoles("milkman"), markPurchasePaid);

export default router;
