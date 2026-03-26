import mongoose from "mongoose";

const betSchema = new mongoose.Schema({

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  match: String,

  team: String, // Team A or Team B

  odds: Number,

  amount: Number,

  status: {
    type: String,
    enum: ["pending", "won", "lost"],
    default: "pending"
  }

}, { timestamps: true });

export default mongoose.model("Bet", betSchema);