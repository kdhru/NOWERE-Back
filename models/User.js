import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    photo: String,
    displayName: {
      type: String,
    },
    // 🚀 Added: Global AI memory for cross-chat personalization
    aiMemory: {
      type: String,
      default: "No specific background or personal instructions provided yet.",
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);