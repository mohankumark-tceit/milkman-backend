import express from "express";
import { verifyToken, authorizeRoles } from "../middlewares/auth.middleware.js";
import {
  createAnnouncement,
  getCustomerAnnouncements,
  getMilkmanAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
} from "../controllers/announcement.controller.js";

const router = express.Router();

// Milkman: Create announcement
router.post("/create", verifyToken, authorizeRoles("milkman"), createAnnouncement);

// Customer: Get announcements from their milkman
router.get("/my-announcements", verifyToken, authorizeRoles("customer"), getCustomerAnnouncements);

// Milkman: Get their announcements
router.get(
  "/milkman-announcements",
  verifyToken,
  authorizeRoles("milkman"),
  getMilkmanAnnouncements
);

// Milkman: Update announcement
router.put("/:id", verifyToken, authorizeRoles("milkman"), updateAnnouncement);

// Milkman: Delete announcement
router.delete("/:id", verifyToken, authorizeRoles("milkman"), deleteAnnouncement);

export default router;
