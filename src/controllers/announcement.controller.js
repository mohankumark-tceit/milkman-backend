import Announcement from "../models/announcement.model.js";

// Create announcement (milkman only)
export const createAnnouncement = async (req, res) => {
  try {
    const { title, message } = req.body;
    const milkmanId = req.user._id;

    const announcement = await Announcement.create({
      milkmanId,
      title,
      message,
    });

    res.status(201).json({
      message: "Announcement created successfully",
      announcement,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get announcements for a customer (from their linked milkman)
export const getCustomerAnnouncements = async (req, res) => {
  try {
    const milkmanId = req.user.milkmanId;

    if (!milkmanId) {
      return res.status(400).json({ message: "Customer not linked to a milkman" });
    }

    const announcements = await Announcement.find({ milkmanId }).sort({ createdAt: -1 });

    res.json({
      announcements,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all announcements by a milkman
export const getMilkmanAnnouncements = async (req, res) => {
  try {
    const milkmanId = req.user._id;

    const announcements = await Announcement.find({ milkmanId }).sort({ createdAt: -1 });

    res.json({
      announcements,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update announcement
export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, message } = req.body;

    const announcement = await Announcement.findByIdAndUpdate(
      id,
      { title, message, updatedAt: new Date() },
      { new: true }
    );

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    res.json({
      message: "Announcement updated successfully",
      announcement,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete announcement
export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findByIdAndDelete(id);

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    res.json({
      message: "Announcement deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
