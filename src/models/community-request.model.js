import mongoose from "mongoose";

const CommunityRequestSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  milkmanId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  milkmanCode: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const CommunityRequest = mongoose.model("CommunityRequest", CommunityRequestSchema);
export default CommunityRequest;
