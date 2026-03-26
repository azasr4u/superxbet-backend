import mongoose from "mongoose";


const scoreSchema = new mongoose.Schema({

  match: String,

  inning: Number,

  runs: Number,
  wickets: Number,
  overs: Number,

  powerplayRuns: Number,

  totalRuns: Number,

  totalWickets: Number,

  runOut: Boolean,
  dropCatch: Boolean,
  bowled: Boolean,

}, { timestamps: true });

export default mongoose.model("Score", scoreSchema);