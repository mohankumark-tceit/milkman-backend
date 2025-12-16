import User from "../models/user.model.js";
import CommunityRequest from "../models/community-request.model.js";

export const sendCommunityRequest = async (req, res) => {
  try {
    const { milkmanCode, title, message } = req.body;
    if (!milkmanCode || !title || !message) {
      return res.status(400).json({ message: "milkmanCode, title and message are required" });
    }

    const milkman = await User.findOne({ referralCode: milkmanCode, role: "milkman" });
    if (!milkman) return res.status(404).json({ message: "Milkman not found" });

    const reqDoc = await CommunityRequest.create({
      senderId: req.user._id,
      milkmanId: milkman._id,
      milkmanCode,
      title,
      message,
    });

    return res.status(201).json({ message: "Request sent", request: reqDoc });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

export const fetchRequestsForMilkman = async (req, res) => {
  try {
    const milkmanId = req.user._id;
    const requests = await CommunityRequest.find({ milkmanId }).populate("senderId", "name email").sort({ createdAt: -1 });
    return res.json({ requests });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

export const markRequestRead = async (req, res) => {
  try {
    const { id } = req.params;
    const reqDoc = await CommunityRequest.findById(id);
    if (!reqDoc) return res.status(404).json({ message: "Request not found" });
    if (reqDoc.milkmanId.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Not allowed" });
    reqDoc.isRead = true;
    await reqDoc.save();
    return res.json({ message: "Marked read" });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Server error" });
  }
};
