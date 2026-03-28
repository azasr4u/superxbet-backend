import mongoose from "mongoose";

const userSchema = new mongoose.Schema({

  // 👤 BASIC INFO
  fullName: {
    type: String,
    trim: true
  },

  address: {
    type: String,
    trim: true
  },

  phone: {
    type: String,
    unique: true,
    required: true,
    index: true
  },

  email: {
    type: String,
    lowercase: true,
    trim: true
  },

  password: {
    type: String,
    required: true
  },

  // 💰 WALLET SYSTEM
  walletBalance: {
    type: Number,
    default: 0
  },

  bonusBalance: {
    type: Number,
    default: 0
  },

  wageringRequired: {
    type: Number,
    default: 0
  },

  // 🎯 FIRST DEPOSIT TRACK
  isFirstDeposit: {
    type: Boolean,
    default: false
  },

  // 🔥 REFERRAL SYSTEM
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },

  referredBy: {
    type: String,
    default: null
  },

  referralRewarded: {
    type: Boolean,
    default: false
  },

  // 🔐 ROLE SYSTEM
  role: {
    type: String,
    enum: ["user", "admin", "agent"],
    default: "user",
    index: true
  },

  // 👨‍💼 AGENT LINK (NO BREAK — KEEP STRING)
  agentId: {
    type: String,
    default: null,
    index: true
  },

  // 🔥 AGENT COMMISSION SYSTEM (NEW)
  commissionBalance: {
    type: Number,
    default: 0
  },

  commissionPercent: {
    type: Number,
    default: 10   // default 10%
  },

  // 🚫 BLOCK SYSTEM
  blocked: {
    type: Boolean,
    default: false,
    index: true
  },

  // ✅ KYC SYSTEM
  kycVerified: {
    type: Boolean,
    default: false
  }

}, {
  timestamps: true
});

export default mongoose.model("User", userSchema);