import mongoose from "mongoose";

const matchSchema = new mongoose.Schema({

  matchName: String,

  teamA: String,
  teamB: String,

  score: {
    type: Number,
    default: 0
  },

  wickets: {
    type: Number,
    default: 0
  },

  overs: {
    type: Number,
    default: 0
  },

  balls: {
    type: Number,
    default: 0
  },

  innings: {
    type: Number,
    default: 1
  },

  target: {
    type: Number,
    default: 0
  },

  /// 🔥 ADD THIS
  result: {
    type: String,
    default: null
  },

  isLive: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

export default mongoose.model("Match", matchSchema);