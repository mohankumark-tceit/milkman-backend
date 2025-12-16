import express from "express";
import { authorizeRoles } from "../middlewares/auth.middleware.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { signup, verifyOTP, login, logout } from "../controllers/auth.controller.js";


const router = express.Router();

router.post("/signup", signup);
router.post("/verify-otp", verifyOTP);
router.post("/login", login);
router.post("/logout", logout);

// Protected Route (any logged-in user)
router.get("/profile", verifyToken, (req, res) => {
  res.json({ user: req.user });
});

// Milkman-only
router.get("/milkman-only", verifyToken, authorizeRoles("milkman"), (req, res) => {
  res.send("Milkman access granted");
});

// Customer-only
router.get("/customer-only", verifyToken, authorizeRoles("customer"), (req, res) => {
  res.send("Customer access granted");
});

export default router;
