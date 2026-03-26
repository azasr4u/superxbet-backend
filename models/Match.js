import mongoose from "mongoose";

const matchSchema = new mongoose.Schema({

  matchName: String,

  teamA: String,
  teamB: String,

  score: Number,
  wickets: Number,
  overs: Number,

  target: Number,

  innings: Number, // 1 or 2

}, { timestamps: true });

export default mongoose.model("Match", matchSchema);