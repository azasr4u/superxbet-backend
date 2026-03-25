import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  fullName: String,
  address: String,
  phone: { type: String, unique: true },
  email: String,
  password: String,

  // 💰 REAL MONEY
  walletBalance: { type: Number, default: 0 },

  // 🎁 BONUS
  bonusBalance: { type: Number, default: 0 },

  // 🎯 WAGER REQUIRED
  wageringRequired: { type: Number, default: 0 },

  // 🔥 REFERRAL
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: String, default: null },
  referralRewarded: { type: Boolean, default: false },

  // FIRST DEPOSIT
  isFirstDeposit: { type: Boolean, default: false },

  // 🔥 ROLE SYSTEM
  role: {
    type: String,
    enum: ["user", "admin", "agent"],
    default: "user"
  }

}, { timestamps: true });

export default mongoose.model("User", userSchema);