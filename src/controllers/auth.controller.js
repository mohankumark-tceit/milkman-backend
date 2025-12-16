import User from "../models/user.model.js";
import OTP from "../models/otp.model.js";
import { generateReferral } from "../utils/referral.js";
import { sendOTPEmail } from "../utils/email.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Signup Step 1: Send OTP
export const signup = async (req, res) => {
  try {
    const { email, password, role, referralCode } = req.body;

    // Validate email
    if (!email || !password || !role) {
      return res.status(400).json({ message: "Email, password, and role are required" });
    }

    // Check existing email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    let milkmanId = null;

    // Customer → validate referral code
    if (role === "customer") {
      const milkman = await User.findOne({ referralCode, role: "milkman" });
      if (!milkman) {
        return res.status(400).json({ message: "Invalid referral code" });
      }
      milkmanId = milkman._id;
    }

    // Milkman cannot use referral code
    if (role === "milkman" && referralCode) {
      return res.status(400).json({ message: "Milkman cannot use referral code" });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing OTP for this email
    await OTP.deleteOne({ email });

    // Save OTP
    await OTP.create({
      email,
      otp,
      expiresAt,
    });

    // Send OTP email (throws on failure)
    try {
      await sendOTPEmail(email, otp);
    } catch (err) {
      console.error("sendOTPEmail error:", err && err.message ? err.message : err);
      return res.status(500).json({ message: "Failed to send OTP. Check email configuration.", error: err && err.message ? err.message : String(err) });
    }

    // Store signup data temporarily (or require client to resend email to continue)
    res.status(200).json({
      message: "OTP sent to email. Verify within 10 minutes.",
      email,
    });
  } catch (error) {
    console.error('auth.controller.signup error:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Signup Step 2: Verify OTP and Create User
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp, password, role, referralCode } = req.body;

    if (!email || !otp || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Find OTP record
    const otpRecord = await OTP.findOne({ email });
    if (!otpRecord) {
      return res.status(400).json({ message: "OTP not found or expired" });
    }

    // Check if OTP is expired
    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ email });
      return res.status(400).json({ message: "OTP has expired. Request a new one." });
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save();

    let milkmanId = null;

    // Customer → validate referral code
    if (role === "customer") {
      const milkman = await User.findOne({ referralCode, role: "milkman" });
      if (!milkman) {
        return res.status(400).json({ message: "Invalid referral code" });
      }
      milkmanId = milkman._id;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await User.create({
      email,
      password: hashedPassword,
      isVerified: true,
      role,
      milkmanId,
      ...(role === "milkman" && { referralCode: generateReferral(email) })
    });

    // Generate JWT (ensure secret exists)
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not set in environment');
      return res.status(500).json({ message: 'Server configuration error: JWT_SECRET not set' });
    }
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      jwtSecret,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "User registered and verified successfully",
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        role: newUser.role,
        referralCode: newUser.referralCode || null,
      },
    });
  } catch (error) {
    console.error('auth.controller.verifyOTP error:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Login Controller
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (!user.isVerified) {
      return res.status(400).json({ message: "Email not verified. Please verify your email first." });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Generate JWT (ensure secret exists)
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not set in environment');
      return res.status(500).json({ message: 'Server configuration error: JWT_SECRET not set' });
    }
    const token = jwt.sign(
      { id: user._id, role: user.role },
      jwtSecret,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('auth.controller.login error:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Logout (Client just deletes token)
export const logout = (req, res) => {
  res.json({ message: "Logout successful – remove token on client side" });
};
