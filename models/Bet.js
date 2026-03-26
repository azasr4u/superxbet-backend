import mongoose from "mongoose";

const betSchema = new mongoose.Schema({

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  match: String,

  /// 🔥 NORMAL BET (OLD)
  team: String,
  odds: Number,
  amount: Number,

  /// 🔥 BUILDER BET (NEW)
  selections: Object,
  stake: Number,

  potentialWin: Number,

  status: {
    type: String,
    enum: ["pending", "won", "lost"],
    default: "pending"
  }

}, { timestamps: true });

export default mongoose.model("Bet", betSchema);