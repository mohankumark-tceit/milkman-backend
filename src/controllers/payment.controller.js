import Payment from "../models/payment.model.js";
import DailyPurchase from "../models/daily-purchase.model.js";
import User from "../models/user.model.js";
import crypto from "crypto";
import Razorpay from "razorpay";

// Create Razorpay order for payment
export const createPaymentOrder = async (req, res) => {
  try {
    const { purchaseIds } = req.body;
    const customerId = req.user._id;
    const milkmanId = req.user.milkmanId;

    if (!milkmanId) {
      return res.status(400).json({ message: "Customer not linked to a milkman" });
    }

    // Fetch purchases and calculate total
    const purchases = await DailyPurchase.find({
      _id: { $in: purchaseIds },
      customerId,
      isPaid: false,
    });

    if (purchases.length === 0) {
      return res.status(400).json({ message: "No unpaid purchases found" });
    }

    const totalAmount = purchases.reduce((sum, p) => sum + p.totalAmount, 0);

    // Create payment record
    const payment = await Payment.create({
      customerId,
      milkmanId,
      amount: totalAmount,
      dailyPurchases: purchaseIds,
      status: "pending",
    });

    // Create Razorpay order using the milkman's credentials when available
    const milkman = await User.findById(milkmanId);
    const keyId = milkman.paymentDetails?.razorpayKeyId || process.env.RAZORPAY_KEY_ID;
    const keySecret = milkman.paymentDetails?.razorpayKeySecret || process.env.RAZORPAY_SECRET;
    if (!keyId || !keySecret) {
      // If Razorpay not configured, still return payment record so milkman can request payment later
      return res.status(201).json({
        message: "Payment record created (Razorpay not configured)",
        paymentId: payment._id,
        amount: totalAmount,
        purchaseCount: purchases.length,
      });
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100),
      currency: "INR",
      receipt: payment._id.toString(),
      payment_capture: 1,
    });

    // Save order id on payment record for traceability
    payment.razorpayOrderId = order.id;
    await payment.save();

    res.status(201).json({
      message: "Payment order created",
      paymentId: payment._id,
      amount: totalAmount,
      purchaseCount: purchases.length,
      order,
      keyId,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Verify Razorpay payment
export const verifyPayment = async (req, res) => {
  try {
    const { paymentId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

    // Load payment to find milkman's secret (if any)
    const paymentRecord = await Payment.findById(paymentId).populate("milkmanId");
    if (!paymentRecord) return res.status(400).json({ message: "Invalid paymentId" });

    const milkman = paymentRecord.milkmanId;
    const secret = milkman?.paymentDetails?.razorpayKeySecret || process.env.RAZORPAY_SECRET || "";

    // Verify signature using the correct secret
    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(`${razorpayOrderId}|${razorpayPaymentId}`);
    const digest = shasum.digest("hex");

    if (digest !== razorpaySignature) {
      return res.status(400).json({ message: "Payment verification failed" });
    }

    // Update payment and mark purchases as paid
    const payment = await Payment.findByIdAndUpdate(
      paymentId,
      {
        status: "completed",
        razorpayPaymentId,
        razorpayOrderId,
        razorpaySignature,
      },
      { new: true }
    ).populate("dailyPurchases");

    // Mark all daily purchases as paid
    await DailyPurchase.updateMany(
      { _id: { $in: payment.dailyPurchases } },
      { isPaid: true }
    );

    res.json({
      message: "Payment verified successfully",
      payment,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get payment history
export const getPaymentHistory = async (req, res) => {
  try {
    const customerId = req.user._id;

    const payments = await Payment.find({ customerId })
      .populate("milkmanId", "name phone")
      .populate("dailyPurchases")
      .sort({ createdAt: -1 });

    res.json({
      payments,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
