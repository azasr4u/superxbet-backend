import mongoose from "mongoose";

const depositSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  amount: Number,
  utr: String,
  screenshot: String,

  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending"
  }

}, { timestamps: true });

export default mongoose.model("Deposit", depositSchema);