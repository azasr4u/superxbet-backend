import { verifyToken, adminOnly, adminOrAgent } from "../middleware/auth.js";
import { applyReferralBonus } from "../services/referralService.js";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import Deposit from "../models/Deposit.js";
import Withdraw from "../models/Withdraw.js";
import User from "../models/User.js";
import KYC from "../models/KYC.js";
import LiveOdds from "../models/LiveOdds.js";
import Match from "../models/Match.js";
import Bet from "../models/Bet.js";

const router = express.Router();
const SECRET = "superxbet_secret";

/// ================= LOGIN =================
router.post("/login", async (req, res) => {

  const { username, password } = req.body;

  const user = await User.findOne({
    $or: [{ phone: username }, { email: username }]
  });

  if (!user) return res.status(400).json({ error: "User not found" });

  if (user.role !== "admin" && user.role !== "agent") {
    return res.status(403).json({ error: "Access denied" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ error: "Wrong password" });

  const token = jwt.sign(
    { id: user._id, role: user.role },
    SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token, role: user.role });
});


/// ================= DASHBOARD =================
router.get("/dashboard", verifyToken, adminOrAgent, async (req, res) => {

  const users = await User.countDocuments();

  const deposits = await Deposit.aggregate([
    { $match: { status: "Approved" } },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);

  const withdraws = await Withdraw.aggregate([
    { $match: { status: "Approved" } },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);

  res.json({
    users,
    deposits: deposits[0]?.total || 0,
    withdraws: withdraws[0]?.total || 0
  });
});


/// ================= USERS =================
router.get("/users", verifyToken, adminOrAgent, async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
});

router.post("/user/delete/:id", verifyToken, adminOnly, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

router.post("/user/block/:id", verifyToken, adminOnly, async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { blocked: true });
  res.json({ message: "Blocked" });
});


/// ================= BONUS =================
router.post("/bonus", verifyToken, adminOnly, async (req, res) => {
  const { userId, amount } = req.body;

  await User.findByIdAndUpdate(userId, {
    $inc: { walletBalance: Number(amount) }
  });

  res.json({ message: "Bonus added" });
});


/// ================= WAGER =================
router.post("/wager", verifyToken, adminOnly, async (req, res) => {
  const { userId, wager } = req.body;

  await User.findByIdAndUpdate(userId, {
    wageringRequired: Number(wager)
  });

  res.json({ message: "Updated" });
});


/// ================= DEPOSITS =================
router.get("/deposits", verifyToken, adminOrAgent, async (req, res) => {
  const deposits = await Deposit.find().populate("userId");
  res.json(deposits);
});

router.post("/deposit/approve/:id", verifyToken, adminOrAgent, async (req, res) => {

  const deposit = await Deposit.findById(req.params.id);

  if (!deposit || deposit.status !== "Pending") {
    return res.status(400).json({ error: "Invalid request" });
  }

  deposit.status = "Approved";
  await deposit.save();

  const user = await User.findById(deposit.userId);
  user.walletBalance += deposit.amount;
  await user.save();

  await applyReferralBonus(user._id);

  res.json({ message: "Approved" });
});


/// ================= WITHDRAW =================
router.get("/withdraws", verifyToken, adminOrAgent, async (req, res) => {
  const data = await Withdraw.find().populate("userId");
  res.json(data);
});

router.post("/withdraw/approve/:id", verifyToken, adminOrAgent, async (req, res) => {

  const withdraw = await Withdraw.findById(req.params.id);
  const user = await User.findById(withdraw.userId);

  if (user.walletBalance < withdraw.amount) {
    return res.status(400).json({ error: "Insufficient balance" });
  }

  user.walletBalance -= withdraw.amount;
  await user.save();

  withdraw.status = "Approved";
  await withdraw.save();

  res.json({ message: "Withdraw approved" });
});


/// ================= ADVANCED ODDS ENGINE =================
function calculateOdds(match) {

  const { score, overs, wickets, target, innings } = match;

  if (innings === 1) {
    return { teamA: 1.95, teamB: 1.95 };
  }

  const ballsPlayed = Math.floor(overs) * 6 + (overs % 1) * 10;
  const ballsLeft = 120 - ballsPlayed;

  const runsNeeded = target - score;
  const requiredRR = runsNeeded / (ballsLeft / 6);
  const currentRR = score / overs;

  let strength = currentRR - requiredRR;

  if (wickets >= 5) strength -= 1;
  if (wickets >= 8) strength -= 2;

  if (overs > 16) {
    if (requiredRR > 10) strength -= 1.5;
    else strength += 0.5;
  }

  if (overs < 6 && wickets <= 1) {
    strength += 0.5;
  }

  let teamA = 1.9 - strength * 0.25;
  let teamB = 1.9 + strength * 0.25;

  teamA += 0.05;
  teamB += 0.05;

  return {
    teamA: Number(Math.max(1.2, Math.min(5, teamA)).toFixed(2)),
    teamB: Number(Math.max(1.2, Math.min(5, teamB)).toFixed(2))
  };
}


/// ================= SCORE + ODDS =================
router.post("/match/update-with-odds",
  verifyToken,
  adminOrAgent,
  async (req, res) => {

  let match = await Match.findOne();

  if (!match) match = new Match(req.body);
  else Object.assign(match, req.body);

  await match.save();

  const autoOdds = calculateOdds(match);

  let finalOdds = { ...autoOdds };
  const adjust = Number(req.body.adjust || 0);

  if (adjust !== 0) {
    finalOdds.teamA *= (1 + adjust / 100);
    finalOdds.teamB *= (1 - adjust / 100);
  }

  await LiveOdds.findOneAndUpdate(
    {},
    { match: match.matchName, odds: finalOdds },
    { upsert: true }
  );

  res.json({ autoOdds, finalOdds });
});


/// ================= RESULT SETTLEMENT =================
router.post("/match/result",
  verifyToken,
  adminOnly,
  async (req, res) => {

  const { winner } = req.body; // "A" or "B"

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


/// ================= GET MATCH =================
router.get("/match", async (req, res) => {
  const match = await Match.findOne();
  res.json(match);
});


/// ================= LIVE ODDS =================
router.get("/live-odds", async (req, res) => {
  const data = await LiveOdds.findOne();
  res.json(data);
});

export default router;