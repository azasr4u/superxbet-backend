import express from "express";
import Withdraw from "../models/Withdraw.js";
import User from "../models/User.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id; // ✅ FIXED (matches token)
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const user = await User.findById(userId);

    // ✅ CRITICAL FIX (NO CRASH)
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    // 🔒 SAFE ACCESS
    if ((user.wageringRequired || 0) > 0) {
      return res.status(400).json({
        error: `Complete wager ₹${user.wageringRequired}`
      });
    }

    if ((user.walletBalance || 0) < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    user.walletBalance -= amount;
    await user.save();

    const withdraw = await Withdraw.create({
      user: userId,
      amount,
      status: "pending"
    });

    res.json({
      success: true,
      message: "Withdraw requested",
      withdraw
    });

  } catch (err) {
    console.log("WITHDRAW ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;