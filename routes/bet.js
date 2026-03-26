import express from "express";
import Bet from "../models/Bet.js";
import User from "../models/User.js";
import LiveOdds from "../models/LiveOdds.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();


/// ================= PLACE BET =================
router.post("/place", verifyToken, async (req, res) => {

  const { team, amount } = req.body;

  const user = await User.findById(req.user.id);

  if (!user) return res.status(404).json({ error: "User not found" });

  if (user.blocked) {
    return res.status(403).json({ error: "User blocked" });
  }

  if (user.walletBalance < amount) {
    return res.status(400).json({ error: "Insufficient balance" });
  }

  /// 🔥 GET LIVE ODDS (IMPORTANT)
  const live = await LiveOdds.findOne();

  if (!live) {
    return res.status(400).json({ error: "No live match" });
  }

  const odds = team === "A"
    ? live.odds.teamA
    : live.odds.teamB;

  /// 🔥 PREVENT MULTIPLE BET
  const existing = await Bet.findOne({
    userId: user._id,
    match: live.match
  });

  if (existing) {
    return res.status(400).json({ error: "Already bet placed" });
  }

  /// 💰 DEDUCT WALLET
  user.walletBalance -= amount;
  await user.save();

  /// 🧾 STORE BET
  const bet = await Bet.create({
    userId: user._id,
    match: live.match,
    team,
    odds,
    amount,
    potentialWin: amount * odds,
    status: "pending"
  });

  res.json({ message: "Bet placed", bet });
});


/// ================= USER BET HISTORY =================
router.get("/my", verifyToken, async (req, res) => {

  const bets = await Bet.find({ userId: req.user.id })
    .sort({ createdAt: -1 });

  res.json(bets);
});


/// ================= ADMIN: SET RESULT (BULK SETTLEMENT) =================
router.post("/result", verifyToken, async (req, res) => {

  const { winner } = req.body; // "A" or "B"

  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin only" });
  }

  const live = await LiveOdds.findOne();

  if (!live) return res.status(400).json({ error: "No match" });

  const bets = await Bet.find({
    match: live.match,
    status: "pending"
  });

  for (let bet of bets) {

    const user = await User.findById(bet.userId);

    if (bet.team === winner) {
      const winAmount = bet.amount * bet.odds;

      user.walletBalance += winAmount;
      bet.status = "won";
    } else {
      bet.status = "lost";
    }

    await user.save();
    await bet.save();
  }

  res.json({ message: "All bets settled" });
});

export default router;