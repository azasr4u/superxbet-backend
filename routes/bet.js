import express from "express";
import Bet from "../models/Bet.js";
import User from "../models/User.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

/// 🎯 PLACE BET
router.post("/place", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const { match, selection, selections, stake, odds, type } = req.body;

    if (!type) {
      return res.status(400).json({ error: "Type is required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    /// 🟣 GUESS IPL WINNER
    if (type === "guess") {

      const existing = await Bet.findOne({
        userId,
        type: "guess"
      });

      if (existing) {
        return res.status(400).json({
          error: "You already placed Guess IPL Winner bet"
        });
      }

      if (user.walletBalance < 100) {
        return res.status(400).json({
          error: "Minimum ₹100 required"
        });
      }

      user.walletBalance -= 100;
      await user.save();

      const bet = await Bet.create({
        userId,
        match: "IPL Winner",
        selection,
        stake: 100,
        odds: odds || 10,
        type: "guess",
        status: "confirmed" // ✅ FIXED (lowercase)
      });

      return res.json({
        success: true,
        message: "Guess IPL Winner placed",
        bet
      });
    }

    /// 🟢 NORMAL / BUILDER BET
    if (user.walletBalance < stake) {
      return res.status(400).json({
        error: "Insufficient balance"
      });
    }

    user.walletBalance -= stake;
    await user.save();

    const bet = await Bet.create({
      userId,
      match,
      selection,
      selections,
      stake,
      odds,
      type,
      status: "confirmed" // ✅ FIXED
    });

    res.json({
      success: true,
      message: "Bet placed successfully",
      bet
    });

  } catch (err) {
    console.log("❌ BET ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/// 🔥 GET MY BETS
router.get("/my", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const bets = await Bet.find({ userId })
      .sort({ createdAt: -1 });

    res.json(bets);

  } catch (err) {
    console.log("BET HISTORY ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/// 🟢 WIN
router.post("/win/:id", async (req, res) => {
  try {
    const bet = await Bet.findById(req.params.id);

    if (!bet || bet.status !== "confirmed") { // ✅ FIXED
      return res.status(400).json({ error: "Invalid bet" });
    }

    const user = await User.findById(bet.userId);

    const winAmount = bet.stake * bet.odds;

    bet.status = "won";
    await bet.save();

    user.walletBalance += winAmount;
    await user.save();

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/// 🔴 LOSE
router.post("/lose/:id", async (req, res) => {
  try {
    const bet = await Bet.findById(req.params.id);

    if (!bet || bet.status !== "confirmed") { // ✅ FIXED
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