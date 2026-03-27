import express from "express";
import Bet from "../models/Bet.js";
import User from "../models/User.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/place", verifyToken, async (req, res) => {
  try {
    console.log("🔥 PLACE BET HIT");

    const userId = req.user.id;
    const { match, selection, selections, odds, stake } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log("💰 BEFORE:", user.walletBalance);

    if (user.walletBalance < stake) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    /// 🔥 WALLET DEDUCT
    user.walletBalance -= stake;
    await user.save();

    console.log("💰 AFTER:", user.walletBalance);

    const bet = new Bet({
      userId,
      match,
      selection,
      selections: selections || null,
      odds,
      stake,
      potentialWin: stake * odds,
      status: "pending",
    });

    await bet.save();

    res.json({
      success: true,
      walletBalance: user.walletBalance,
      bet,
    });

  } catch (err) {
    console.log("❌ ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/my", verifyToken, async (req, res) => {
  const bets = await Bet.find({ userId: req.user.id })
    .sort({ createdAt: -1 });

  res.json(bets);
});

export default router;