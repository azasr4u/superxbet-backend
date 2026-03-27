import mongoose from "mongoose";

const betSchema = new mongoose.Schema({

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  match: String,

  /// ✅ SINGLE BET (MAIN FIX)
  selection: {
    type: String,
    required: true
  },

  odds: Number,
  stake: Number,

  potentialWin: Number,

  /// 🔥 OPTIONAL (FUTURE BUILDER SUPPORT)
  selections: {
    type: Object,
    default: null
  },

  status: {
    type: String,
    enum: ["pending", "won", "lost"],
    default: "pending"
  }

}, { timestamps: true });

export default mongoose.model("Bet", betSchema);