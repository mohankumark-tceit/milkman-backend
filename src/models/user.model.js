import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  
  role: { type: String, enum: ["milkman", "customer"], required: true },

  milkmanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },

  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },

  pricePerLitre: {
    type: Number,
    default: null, // Only set for milkmen
  },

  // Optional Razorpay credentials for milkmen to accept payments directly
  paymentDetails: {
    razorpayKeyId: { type: String, default: null },
    razorpayKeySecret: { type: String, default: null },
    // Optional UPI / wallet payment details
    upiId: { type: String, default: null },
    walletContacts: {
      paytm: { type: String, default: null },
      gpay: { type: String, default: null },
      phonepe: { type: String, default: null },
    },
  },

  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", UserSchema);
export default User;
