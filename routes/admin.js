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

import { updateScore } from "../services/scoreEngine.js";
import { calculateOdds } from "../services/oddsEngine.js";

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


/// ================= MATCH + ODDS =================
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

  try {

    const { winner } = req.body;

    const match = await Match.findOne();
    if (!match) {
      return res.status(400).json({ error: "No match found" });
    }

    /// 🔒 PREVENT DOUBLE RESULT
    if (match.result) {
      return res.status(400).json({ error: "Result already declared" });
    }

    /// SAVE RESULT
    match.result = winner;
    match.isLive = false;
    await match.save();

    /// GET BETS
    const bets = await Bet.find({
      match: match.matchName,
      status: "pending",
      settled: false
    });

    for (let bet of bets) {

      const user = await User.findById(bet.userId);

      /// SINGLE BET ONLY
      if (bet.type === "single") {

        if (bet.selection === winner) {
          user.walletBalance += bet.potentialWin;
          bet.status = "won";
        } else {
          bet.status = "lost";
        }

        bet.settled = true;
      }

      await user.save();
      await bet.save();
    }

    res.json({
      message: "Match settled successfully"
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Settlement failed" });
  }
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


/// ================= BET MANAGEMENT =================
router.get("/bets", verifyToken, adminOrAgent, async (req, res) => {

  const bets = await Bet.find()
    .populate("userId", "phone walletBalance")
    .sort({ createdAt: -1 });

  res.json(bets);
});


/// ================= MANUAL SETTLEMENT =================
router.post("/bet/settle", verifyToken, adminOnly, async (req, res) => {

  const { betId, result } = req.body;

  const bet = await Bet.findById(betId);

  if (!bet) {
    return res.status(404).json({ error: "Bet not found" });
  }

  if (bet.settled) {
    return res.status(400).json({ error: "Already settled" });
  }

  const user = await User.findById(bet.userId);

  if (result === "won") {
    user.walletBalance += bet.potentialWin;
    bet.status = "won";
  }
  else if (result === "lost") {
    bet.status = "lost";
  }
  else if (result === "void") {
    user.walletBalance += bet.stake;
    bet.status = "void";
  }

  bet.settled = true;
  bet.result = result;

  await user.save();
  await bet.save();

  res.json({ success: true });
});


/// ================= SCORE ENGINE =================
router.post("/score/update", verifyToken, adminOrAgent, async (req, res) => {

  const { action } = req.body;

  let match = await Match.findOne();

  if (!match) {
    match = new Match({ matchName: "Live Match" });
  }

  match = updateScore(match, action);
  await match.save();

  const odds = calculateOdds(match);

  await LiveOdds.findOneAndUpdate(
    {},
    { match: match.matchName, odds },
    { upsert: true }
  );

  res.json({ match, odds });
});
import Deposit from "../models/Deposit.js";
import User from "../models/User.js";

/* ============================
   GET ALL DEPOSITS
============================ */
router.get("/deposits", async (req, res) => {
  try {
    const data = await Deposit.find().sort({ createdAt: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================
   APPROVE DEPOSIT
============================ */
router.post("/deposit/approve/:id", async (req, res) => {
  try {
    const dep = await Deposit.findById(req.params.id);

    if (!dep) return res.status(404).json({ error: "Not found" });
    if (dep.status !== "pending")
      return res.json({ message: "Already processed" });

    // update status
    dep.status = "approved";
    await dep.save();

    // update user wallet
    const user = await User.findById(dep.userId);
    user.balance += dep.amount;
    await user.save();

    res.json({ message: "Deposit approved" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================
   REJECT DEPOSIT
============================ */
router.post("/deposit/reject/:id", async (req, res) => {
  try {
    const dep = await Deposit.findById(req.params.id);

    if (!dep) return res.status(404).json({ error: "Not found" });
    if (dep.status !== "pending")
      return res.json({ message: "Already processed" });

    dep.status = "rejected";
    await dep.save();

    res.json({ message: "Deposit rejected" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;