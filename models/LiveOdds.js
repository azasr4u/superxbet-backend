import mongoose from "mongoose";

const schema = new mongoose.Schema({
  match: String,
  odds: {
    teamA: Number,
    teamB: Number
  }
});

export default mongoose.model("LiveOdds", schema);