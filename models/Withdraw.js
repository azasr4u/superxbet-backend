import mongoose from "mongoose";

const withdrawSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // ✅ FIXED
  amount: Number,
  method: String, // ✅ ADDED
  details: Object, // ✅ ADDED
  status: { type: String, default: "pending" }
}, { timestamps: true });

export default mongoose.model("Withdraw", withdrawSchema);