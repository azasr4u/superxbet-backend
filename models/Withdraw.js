import mongoose from "mongoose";

const withdrawSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  amount: Number,
  status: { type: String, default: "Pending" }
}, { timestamps: true });

export default mongoose.model("Withdraw", withdrawSchema);