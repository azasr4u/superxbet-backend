import mongoose from "mongoose";

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  document: String,
  status: { type: String, default: "Pending" }
});

export default mongoose.model("KYC", schema);