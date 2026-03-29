import mongoose from "mongoose";

const matchSchema = new mongoose.Schema({

  matchName: {
    type: String,
    default: ""
  },

  teamA: {
    type: String,
    default: ""
  },

  teamB: {
    type: String,
    default: ""
  },

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

  // 🏆 RESULT
  result: {
    type: String,
    default: ""
  },

  // 🔴 LIVE / ENDED
  isLive: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

export default mongoose.model("Match", matchSchema);