import mongoose from "mongoose";

const depositSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  amount: Number,
  method: String,
  utr: String,
  screenshot: String,
  status: { type: String, default: "Pending" }
}, { timestamps: true });

export default mongoose.model("Deposit", depositSchema);