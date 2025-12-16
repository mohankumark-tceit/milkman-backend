import User from "../models/user.model.js";
import DailyPurchase from "../models/daily-purchase.model.js";
import Payment from "../models/payment.model.js";
import Razorpay from "razorpay";
import Announcement from "../models/announcement.model.js";

// Set or update price per litre (milkman only)
export const setPricePerLitre = async (req, res) => {
  try {
    const { pricePerLitre } = req.body;
    const milkmanId = req.user._id;

    if (!pricePerLitre || pricePerLitre <= 0) {
      return res.status(400).json({ message: "Invalid price" });
    }

    const milkman = await User.findByIdAndUpdate(
      milkmanId,
      { pricePerLitre },
      { new: true }
    ).select("-password");

    res.json({
      message: "Price per litre updated successfully",
      pricePerLitre: milkman.pricePerLitre,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Receive live location updates from milkman and broadcast to customers via announcement
export const trackLocation = async (req, res) => {
  try {
    const milkmanId = req.user._id;
    const { latitude, longitude, stop } = req.body;

    if (stop) {
      // Stop sharing: remove any existing Live Location announcement
      await Announcement.findOneAndDelete({ milkmanId, title: "Live Location" });
      return res.json({ message: "Stopped sharing live location" });
    }

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return res.status(400).json({ message: "latitude and longitude are required and must be numbers" });
    }

    const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
    const message = `Live location — ${mapsLink} (updated ${new Date().toLocaleString()})`;

    // Upsert a single announcement so customers see the latest live location (no spam)
    const announcement = await Announcement.findOneAndUpdate(
      { milkmanId, title: "Live Location" },
      { title: "Live Location", message, updatedAt: new Date(), createdAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ message: "Live location updated", announcement });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get milkman profile with price
export const getMilkmanProfile = async (req, res) => {
  try {
    const milkmanId = req.user._id;

    const milkman = await User.findById(milkmanId).select("-password");

    res.json({
      milkman,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Set or update Razorpay credentials for milkman
export const setPaymentDetails = async (req, res) => {
  try {
    const milkmanId = req.user._id;
    const { razorpayKeyId, razorpayKeySecret, upiId, paytm, gpay, phonepe } = req.body;

    // Allow partial updates; merge existing
    const existing = await User.findById(milkmanId).select("paymentDetails");
    const newPaymentDetails = {
      ...existing?.paymentDetails?.toObject?.(),
      razorpayKeyId: razorpayKeyId ?? existing?.paymentDetails?.razorpayKeyId ?? null,
      razorpayKeySecret: razorpayKeySecret ?? existing?.paymentDetails?.razorpayKeySecret ?? null,
      upiId: upiId ?? existing?.paymentDetails?.upiId ?? null,
      walletContacts: {
        paytm: paytm ?? existing?.paymentDetails?.walletContacts?.paytm ?? null,
        gpay: gpay ?? existing?.paymentDetails?.walletContacts?.gpay ?? null,
        phonepe: phonepe ?? existing?.paymentDetails?.walletContacts?.phonepe ?? null,
      },
    };

    const milkman = await User.findByIdAndUpdate(
      milkmanId,
      { paymentDetails: newPaymentDetails },
      { new: true }
    ).select("-password");

    res.json({ message: "Payment details saved", milkman });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create a Razorpay order for a customer (milkman initiates)
export const createPaymentForCustomer = async (req, res) => {
  try {
    const milkmanId = req.user._id;
    const { customerId, purchaseIds } = req.body;

    if (!customerId || !purchaseIds || !Array.isArray(purchaseIds) || purchaseIds.length === 0) {
      return res.status(400).json({ message: "customerId and purchaseIds are required" });
    }

    // Fetch unpaid purchases for this customer and milkman
    const purchases = await DailyPurchase.find({
      _id: { $in: purchaseIds },
      customerId,
      milkmanId,
      isPaid: false,
    });

    if (!purchases.length) {
      return res.status(400).json({ message: "No valid unpaid purchases found for this customer" });
    }

    const totalAmount = purchases.reduce((sum, p) => sum + p.totalAmount, 0);

    // Create Payment record
    const payment = await Payment.create({
      customerId,
      milkmanId,
      amount: totalAmount,
      dailyPurchases: purchaseIds,
      status: "pending",
    });

    // Prefer milkman's own keys if configured, otherwise fallback to server keys
    const milkman = await User.findById(milkmanId);
    const keyId = milkman.paymentDetails?.razorpayKeyId || process.env.RAZORPAY_KEY_ID;
    const keySecret = milkman.paymentDetails?.razorpayKeySecret || process.env.RAZORPAY_SECRET;
    if (!keyId || !keySecret) {
      return res.status(500).json({ message: "Razorpay not configured (server or milkman)" });
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    // Create Razorpay order (amount in paise)
    const order = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100),
      currency: "INR",
      receipt: payment._id.toString(),
      payment_capture: 1,
    });

    // Save order id on payment record for traceability
    payment.razorpayOrderId = order.id;
    await payment.save();

    // Return order info and payment id
    res.status(201).json({
      message: "Razorpay order created",
      paymentId: payment._id,
      amount: totalAmount,
      order,
      keyId,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
