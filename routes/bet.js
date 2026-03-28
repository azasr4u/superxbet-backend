import express from "express";
import Bet from "../models/Bet.js";
import User from "../models/User.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

/// 🎯 PLACE BET (REAL)
router.post("/place", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { match, selection, stake, odds } = req.body;

    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.walletBalance < stake) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // 💸 DEDUCT MONEY
    user.walletBalance -= stake;
    await user.save();

    const bet = await Bet.create({
      user: userId,
      match,
      selection,
      stake,
      odds,
      status: "pending"
    });

    res.json({ success: true, bet });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/// 🟢 WIN
router.post("/win/:id", async (req, res) => {
  try {
    const bet = await Bet.findById(req.params.id).populate("user");

    if (!bet || bet.status !== "pending") {
      return res.status(400).json({ error: "Invalid bet" });
    }

    const winAmount = bet.stake * bet.odds;

    bet.status = "won";
    await bet.save();

    bet.user.walletBalance += winAmount;
    await bet.user.save();

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/// 🔴 LOSE
router.post("/lose/:id", async (req, res) => {
  try {
    const bet = await Bet.findById(req.params.id);

    if (!bet || bet.status !== "pending") {
      return res.status(400).json({ error: "Invalid bet" });
    }

    bet.status = "lost";
    await bet.save();

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;