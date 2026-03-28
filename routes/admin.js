import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { verifyToken, adminOnly, adminOrAgent } from "../middleware/auth.js";
import { applyReferralBonus } from "../services/referralService.js";

import Deposit from "../models/Deposit.js";
import Withdraw from "../models/Withdraw.js";
import User from "../models/User.js";
import Match from "../models/Match.js";
import Bet from "../models/Bet.js";
import LiveOdds from "../models/LiveOdds.js";

import { updateScore } from "../services/scoreEngine.js";
import { calculateOdds } from "../services/oddsEngine.js";

const router = express.Router();
const SECRET = process.env.JWT_SECRET || "superxbet_secret";

/// ================= LOGIN =================
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({
    $or: [{ phone: username }, { email: username }]
  });

  if (!user) return res.status(400).json({ error: "User not found" });

  if (!["admin", "agent"].includes(user.role)) {
    return res.status(403).json({ error: "Access denied" });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: "Wrong password" });

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

  const dep = await Deposit.aggregate([
    { $match: { status: "Approved" } },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);

  const wit = await Withdraw.aggregate([
    { $match: { status: "Approved" } },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);

  res.json({
    users,
    deposits: dep[0]?.total || 0,
    withdraws: wit[0]?.total || 0
  });
});


/// ================= USERS =================
router.get("/users", verifyToken, adminOnly, async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
});

router.post("/user/block", verifyToken, adminOnly, async (req, res) => {
  const { userId, blocked } = req.body;
  await User.findByIdAndUpdate(userId, { blocked });
  res.json({ success: true });
});

router.post("/user/kyc", verifyToken, adminOnly, async (req, res) => {
  const { userId, status } = req.body;
  await User.findByIdAndUpdate(userId, { kycVerified: status });
  res.json({ success: true });
});

router.post("/user/balance", verifyToken, adminOnly, async (req, res) => {
  const { userId, amount } = req.body;

  const user = await User.findById(userId);

  if (user.walletBalance + amount < 0) {
    return res.status(400).json({ error: "Insufficient balance" });
  }

  user.walletBalance += Number(amount);
  await user.save();

  res.json({ success: true });
});


/// ================= DEPOSITS =================
router.get("/deposits", verifyToken, adminOrAgent, async (req, res) => {
  const data = await Deposit.find().populate("userId");
  res.json(data);
});

router.post("/deposit/approve/:id", verifyToken, adminOnly, async (req, res) => {
  const dep = await Deposit.findById(req.params.id);

  if (!dep || dep.status !== "Pending") {
    return res.status(400).json({ error: "Invalid request" });
  }

  dep.status = "Approved";
  await dep.save();

  const user = await User.findById(dep.userId);
  user.walletBalance += dep.amount;
  await user.save();

  await applyReferralBonus(user._id);

  res.json({ message: "Approved" });
});


/// ================= WITHDRAW =================
router.get("/withdraws", verifyToken, adminOrAgent, async (req, res) => {
  const data = await Withdraw.find().populate("userId");
  res.json(data);
});

router.post("/withdraw/approve/:id", verifyToken, adminOnly, async (req, res) => {
  const wd = await Withdraw.findById(req.params.id);
  const user = await User.findById(wd.userId);

  if (user.walletBalance < wd.amount) {
    return res.status(400).json({ error: "Insufficient balance" });
  }

  user.walletBalance -= wd.amount;
  await user.save();

  wd.status = "Approved";
  await wd.save();

  res.json({ message: "Approved" });
});


/// ================= MATCH CONTROL =================
router.post("/match/update-with-odds",
  verifyToken,
  adminOnly,
  async (req, res) => {

  let match = await Match.findOne();

  if (!match) match = new Match(req.body);
  else Object.assign(match, req.body);

  await match.save();

  const odds = calculateOdds(match);

  await LiveOdds.findOneAndUpdate(
    {},
    { match: match.matchName, odds },
    { upsert: true }
  );

  res.json({ odds });
});


/// ================= RESULT =================
router.post("/match/result", verifyToken, adminOnly, async (req, res) => {
  const { winner } = req.body;

  const bets = await Bet.find({ status: "pending" });

  for (let bet of bets) {
    const user = await User.findById(bet.userId);

    if (bet.selection === winner) {
      user.walletBalance += bet.potentialWin;
      bet.status = "won";
    } else {
      bet.status = "lost";
    }

    bet.settled = true;

    await user.save();
    await bet.save();
  }

  res.json({ message: "Settled" });
});


/// ================= BETS =================
router.get("/bets", verifyToken, adminOrAgent, async (req, res) => {
  const bets = await Bet.find()
    .populate("userId", "phone walletBalance")
    .sort({ createdAt: -1 });

  res.json(bets);
});


export default router;