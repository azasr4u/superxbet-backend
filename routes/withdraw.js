import express from "express";
import Withdraw from "../models/Withdraw.js";
import User from "../models/User.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// ================= CREATE WITHDRAW =================
router.post("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const { amount, method, details } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // ✅ FIXED: accept both upi & upiId
    if (!details || (!details.upi && !details.upiId)) {
      return res.status(400).json({ error: "UPI ID required" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    if ((user.walletBalance || 0) < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // deduct balance
    user.walletBalance -= amount;
    await user.save();

    const withdraw = await Withdraw.create({
      user: userId, // ✅ FIXED FIELD
      amount,
      method,
      details,
      status: "pending"
    });

    res.json({
      success: true,
      message: "Withdraw requested",
      withdraw
    });

  } catch (err) {
    console.log("WITHDRAW ERROR FULL:", err.stack);
    res.status(500).json({ error: err.message });
  }
});

// ================= WITHDRAW HISTORY =================
router.get("/my", verifyToken, async (req, res) => {
  try {
    const withdraws = await Withdraw.find({ user: req.user.id })
      .sort({ createdAt: -1 });

    res.json(withdraws);
  } catch (err) {
    console.log("WITHDRAW HISTORY ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;