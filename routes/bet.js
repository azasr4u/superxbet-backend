import express from "express";
import Bet from "../models/Bet.js";
import User from "../models/User.js";
import LiveOdds from "../models/LiveOdds.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();


/// ================= NORMAL BET =================
router.post("/market", verifyToken, async (req, res) => {

  try {
    const { type, selection, odds, stake } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.walletBalance < stake) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    user.walletBalance -= stake;
    await user.save();

    const bet = await Bet.create({
      userId: user._id,
      match: "LIVE MATCH",
      selections: { type, selection },
      odds,
      stake,
      potentialWin: stake * odds,
    });

    res.json({ message: "Bet placed", bet });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/// ================= BUILDER BET =================
router.post("/builder", verifyToken, async (req, res) => {

  const { selections, stake, odds } = req.body;

  const user = await User.findById(req.user.id);

  if (!user) return res.status(404).json({ error: "User not found" });

  if (user.walletBalance < stake) {
    return res.status(400).json({ error: "Insufficient balance" });
  }

  const live = await LiveOdds.findOne();

  user.walletBalance -= stake;
  await user.save();

  const bet = await Bet.create({
    userId: user._id,
    match: live?.match || "Custom Match",
    selections,
    stake,
    odds,
    potentialWin: stake * odds
  });

  res.json({ message: "Builder bet placed", bet });
});


/// ================= HISTORY =================
router.get("/my", verifyToken, async (req, res) => {

  const bets = await Bet.find({ userId: req.user.id })
    .sort({ createdAt: -1 });

  res.json(bets);
});

export default router;