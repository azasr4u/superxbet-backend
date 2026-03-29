import mongoose from "mongoose";

const betSchema = new mongoose.Schema({

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  match: String,

  /// 🔥 TYPE
  type: {
    type: String,
   enum: ["single", "builder", "guess"],
    required: true
  },

  /// 🔹 SINGLE BET
  selection: {
    type: String,
    default: null
  },

  /// 🔹 BUILDER BET
  selections: {
    type: Object,
    default: null
  },

  odds: Number,
  stake: Number,
  potentialWin: Number,

  /// 🔥 STATUS
  status: {
    type: String,
    enum: ["pending", "won", "lost", "void"],
    default: "pending"
  },

  /// 🔥 RESULT SOURCE
  result: {
    type: String,
    default: null
  },

  /// 🔒 LOCK (prevents double settlement)
  settled: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

export default mongoose.model("Bet", betSchema);