import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const verifyTransport = async () => {
  try {
    await transporter.verify();
    console.log("Email transport verified");
    return true;
  } catch (err) {
    console.error("Email transport verification failed:", err && err.message ? err.message : err);
    return false;
  }
};

export const sendOTPEmail = async (email, otp) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP for Milkman App Verification",
      html: `
        <h2>Verify Your Email</h2>
        <p>Your OTP is: <strong>${otp}</strong></p>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });
    console.log("OTP email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Email sending failed:", error && error.message ? error.message : error);
    throw error;
  }
};
