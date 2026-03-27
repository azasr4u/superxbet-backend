import express from "express";
import Bet from "../models/Bet.js";
import User from "../models/User.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

/// 🔥 PLACE MARKET BET (FINAL FIXED)
router.post("/market", verifyToken, async (req, res) => {
  try {
    const { type, selection, odds, stake } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    /// ✅ CHECK BALANCE
    if ((user.walletBalance || 0) < stake) {
      return res.json({ success: false, message: "Insufficient balance" });
    }

    /// ✅ DEDUCT WALLET
    user.walletBalance -= stake;
    await user.save();

    /// ✅ SAVE BET
    const bet = new Bet({
      userId: user._id,
      type,
      selection,
      odds,
      stake,
      status: "pending",
      createdAt: new Date()
    });

    await bet.save();

    res.json({
      success: true,
      message: "Bet placed",
      newBalance: user.walletBalance
    });

  } catch (err) {
    console.log(err);
    res.json({ success: false, message: "Server error" });
  }
});

/// 🔥 GET MY BETS
router.get("/my", verifyToken, async (req, res) => {
  try {
    const bets = await Bet.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(bets);
  } catch {
    res.json([]);
  }
});

export default router;