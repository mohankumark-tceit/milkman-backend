import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import authRoutes from './routes/auth.route.js';
import { verifyTransport } from './utils/email.js';
import purchaseRoutes from './routes/purchase.route.js';
import announcementRoutes from './routes/announcement.route.js';
import paymentRoutes from './routes/payment.route.js';
import milkmanRoutes from './routes/milkman.route.js';
import communityRoutes from './routes/community.route.js';
import { connectDB } from './lib/db.js';
const app = express();
const port = process.env.PORT || 5001;

// Check required environment variables early and fail fast with clear message
const requiredEnv = ["JWT_SECRET", "MONGODB_URI"];
const missing = requiredEnv.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required environment variable(s): ${missing.join(", ")}`);
  console.error("Create a .env file in backend/ or set these variables in your environment.");
  // Exit so developer notices and fixes config instead of chasing obscure runtime 500s
  process.exit(1);
}
// Warn if Razorpay not configured; payments will be disabled until configured
const missingRzp = ["RAZORPAY_KEY_ID", "RAZORPAY_SECRET"].filter(k => !process.env[k]);
if (missingRzp.length) {
  console.warn(`Razorpay not fully configured: missing ${missingRzp.join(", ")}. Payment features will be disabled.`);
}app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Configure CORS origins via `CORS_ORIGIN` env var (comma-separated). Defaults to http://localhost:5173 for local dev.
const corsOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) : ["http://localhost:5173"];
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g., server-to-server or curl) when origin is undefined
    if (!origin) return callback(null, true);
    if (corsOrigins.includes(origin)) return callback(null, true);
    callback(new Error("CORS origin denied"));
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use("/api/auth",authRoutes);
app.use("/api/purchases",purchaseRoutes);
app.use("/api/announcements",announcementRoutes);
app.use("/api/payments",paymentRoutes);
app.use("/api/milkman",milkmanRoutes);
app.use("/api/community", communityRoutes);


app.listen(port, () => {    
    console.log(`Server is running on http://localhost:${port}`);   
    connectDB();
    // Verify email transport (logs result) — helpful to surface config issues early
    verifyTransport().then(ok => {
      if (!ok) {
        console.warn('Email transport NOT configured correctly. OTP emails will fail.');
      }
    });
});