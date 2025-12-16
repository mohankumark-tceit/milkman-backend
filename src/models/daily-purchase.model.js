import mongoose from "mongoose";

const DailyPurchaseSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  milkmanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  litres: {
    type: Number,
    required: true,
    min: 0,
  },
  pricePerLitre: {
    type: Number,
    required: true,
    min: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  // Frequency in days (e.g., 15 or 30) for payment deadline
  frequency: {
    type: Number,
    enum: [15, 30],
    default: 15,
  },
  // Computed due date for payment
  dueDate: {
    type: Date,
  },
  date: {
    type: Date,
    default: () => new Date().setHours(0, 0, 0, 0), // Start of today
  },
  isPaid: {
    type: Boolean,
    default: false,
  },
  createdAt: { type: Date, default: Date.now },
});

const DailyPurchase = mongoose.model("DailyPurchase", DailyPurchaseSchema);
export default DailyPurchase;
