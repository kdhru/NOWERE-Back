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
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);