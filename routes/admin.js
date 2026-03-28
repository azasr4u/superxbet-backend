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

/* ============================
   GET ALL WITHDRAWS
============================ */
router.get("/withdraws", async (req, res) => {
  try {
    const data = await Withdraw.find().sort({ createdAt: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================
   APPROVE WITHDRAW
============================ */
router.post("/withdraw/approve/:id", async (req, res) => {
  try {
    const wd = await Withdraw.findById(req.params.id);

    if (!wd) return res.status(404).json({ error: "Not found" });
    if (wd.status !== "pending")
      return res.json({ message: "Already processed" });

    const user = await User.findById(wd.userId);

    // safety check
    if (user.balance < wd.amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // deduct balance
    user.balance -= wd.amount;
    await user.save();

    // update status
    wd.status = "approved";
    await wd.save();

    res.json({ message: "Withdraw approved" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================
   REJECT WITHDRAW
============================ */
router.post("/withdraw/reject/:id", async (req, res) => {
  try {
    const wd = await Withdraw.findById(req.params.id);

    if (!wd) return res.status(404).json({ error: "Not found" });
    if (wd.status !== "pending")
      return res.json({ message: "Already processed" });

    wd.status = "rejected";
    await wd.save();

    res.json({ message: "Withdraw rejected" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================
   GET ALL BETS
============================ */
router.get("/bets", async (req, res) => {
  try {
    const bets = await Bet.find().sort({ createdAt: -1 });
    res.json(bets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================
   SETTLE BET
============================ */
router.post("/bet/settle/:id", async (req, res) => {
  try {
    const { result } = req.body; // win or lose

    const bet = await Bet.findById(req.params.id);
    if (!bet) return res.status(404).json({ error: "Bet not found" });

    if (bet.status !== "pending") {
      return res.json({ message: "Already settled" });
    }

    const user = await User.findById(bet.userId);

    if (result === "win") {
      const winAmount = bet.stake * bet.odds;

      user.balance += winAmount;
      bet.status = "won";
      bet.winAmount = winAmount;
    } else {
      bet.status = "lost";
      bet.winAmount = 0;
    }

    await user.save();
    await bet.save();

    res.json({ message: "Bet settled" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================
   LIVE CONTROL STATS
============================ */
router.get("/live-stats", async (req, res) => {
  try {

    const totalUsers = await User.countDocuments();

    const totalBets = await Bet.countDocuments({
      status: "pending"
    });

    const totalDeposits = await Deposit.aggregate([
      { $match: { status: "approved" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const totalWithdraws = await Withdraw.aggregate([
      { $match: { status: "approved" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const deposits = totalDeposits[0]?.total || 0;
    const withdraws = totalWithdraws[0]?.total || 0;

    const profit = deposits - withdraws;

    res.json({
      users: totalUsers,
      activeBets: totalBets,
      deposits,
      withdraws,
      profit
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================
   CREATE / UPDATE MATCH + ODDS
============================ */
router.post("/match/control", async (req, res) => {
  try {

    const { match, teamA, teamB, oddsA, oddsB } = req.body;

    let data = await LiveOdds.findOne();

    if (!data) {
      data = new LiveOdds({
        match,
        teamA,
        teamB,
        oddsA,
        oddsB
      });
    } else {
      data.match = match;
      data.teamA = teamA;
      data.teamB = teamB;
      data.oddsA = oddsA;
      data.oddsB = oddsB;
    }

    await data.save();

    res.json({ message: "Match updated" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/* ============================
   GET CURRENT MATCH
============================ */
router.get("/match/current", async (req, res) => {
  const data = await LiveOdds.findOne();
  res.json(data);
});


/* ============================
   SET MATCH RESULT (AUTO SETTLE)
============================ */
router.post("/match/result", async (req, res) => {
  try {

    const { winner } = req.body;

    const bets = await Bet.find({ status: "pending" });

    for (let bet of bets) {

      const user = await User.findById(bet.userId);

      if (bet.selection === winner) {
        const winAmount = bet.stake * bet.odds;
        user.balance += winAmount;
        bet.status = "won";
      } else {
        bet.status = "lost";
      }

      await user.save();
      await bet.save();
    }

    res.json({ message: "Match settled" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================
   CREATE AGENT
============================ */
router.post("/agent/create", async (req, res) => {
  try {

    const { phone, password } = req.body;

    const hashed = await bcrypt.hash(password, 10);

    const agent = new User({
      phone,
      password: hashed,
      role: "agent"
    });

    await agent.save();

    res.json({ message: "Agent created" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================
   ASSIGN USER TO AGENT
============================ */
router.post("/agent/assign", async (req, res) => {
  try {

    const { userId, agentId } = req.body;

    const user = await User.findById(userId);
    user.agentId = agentId;

    await user.save();

    res.json({ message: "Assigned" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
/* ============================
   GET AGENT USERS
============================ */
router.get("/agent/users", async (req, res) => {
  try {

    const agentId = req.user.id;

    const users = await User.find({ agentId });

    res.json(users);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
export default router;