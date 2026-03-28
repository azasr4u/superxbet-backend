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
import KYC from "../models/KYC.js";
import MQR from "../models/MQR.js";
import Bank from "../models/BankAccount.js";

import { calculateOdds } from "../services/oddsEngine.js";

const router = express.Router();
const SECRET = process.env.JWT_SECRET || "superxbet_secret";


// ================= LOGIN =================
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


// ================= CREATE AGENT =================
router.post("/agent/create", verifyToken, adminOnly, async (req,res)=>{
  const { name, phone, password } = req.body;

  const hashed = await bcrypt.hash(password, 10);

  const agent = await User.create({
    fullName: name,
    phone,
    password: hashed,
    role: "agent",
    commissionBalance: 0,
    commissionPercent: 10
  });

  res.json({ success:true, agent });
});


// ================= DELETE AGENT =================
router.delete("/agent/:id", verifyToken, adminOnly, async (req,res)=>{
  await User.findByIdAndDelete(req.params.id);
  res.json({ success:true });
});


// ================= SET AGENT % =================
router.post("/agent/set-percent", verifyToken, adminOnly, async (req,res)=>{
  const { agentId, percent } = req.body;

  await User.findByIdAndUpdate(agentId, {
    commissionPercent: percent
  });

  res.json({ success:true });
});


// ================= DASHBOARD =================
router.get("/dashboard", verifyToken, adminOrAgent, async (req, res) => {
  const users = await User.find().select(
    "phone walletBalance wageringRequired bonusBalance"
  );

  const deposits = await Deposit.find({ status: "Approved" });
  const withdraws = await Withdraw.find({ status: "Approved" });

  res.json({
    totalUsers: users.length,
    totalDeposits: deposits.reduce((a,b)=>a+b.amount,0),
    totalWithdraws: withdraws.reduce((a,b)=>a+b.amount,0),
    users: users.map(u => ({
      phone: u.phone,
      wallet: u.walletBalance || 0,
      wageringLeft: u.wageringRequired || 0,
      bonus: u.bonusBalance || 0
    }))
  });
});


// ================= USERS =================
router.get("/users", verifyToken, adminOnly, async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
});

router.post("/user/block", verifyToken, adminOnly, async (req, res) => {
  const { userId, blocked } = req.body;
  await User.findByIdAndUpdate(userId, { blocked });
  res.json({ success: true });
});


// ================= KYC =================
router.post("/user/kyc", verifyToken, adminOnly, async (req, res) => {
  const { userId, status } = req.body;

  const user = await User.findById(userId);
  user.kycVerified = status;
  await user.save();

  await KYC.findOneAndUpdate(
    { userId },
    { status: status ? "Approved" : "Pending" },
    { upsert: true }
  );

  res.json({ success: true });
});


// ================= BALANCE =================
router.post("/user/balance", verifyToken, adminOnly, async (req, res) => {
  const { userId, amount } = req.body;

  const user = await User.findById(userId);
  user.walletBalance += Number(amount);
  await user.save();

  res.json({ success: true });
});


// ================= DEPOSITS =================
router.get("/deposits", verifyToken, adminOrAgent, async (req, res) => {
  const data = await Deposit.find()
    .populate("userId", "phone")
    .sort({ createdAt: -1 });

  res.json(data);
});

router.post("/deposit/approve/:id", verifyToken, adminOnly, async (req, res) => {
  const dep = await Deposit.findById(req.params.id);
  const user = await User.findById(dep.userId);

  dep.status = "Approved";
  await dep.save();

  user.walletBalance += dep.amount;
  await user.save();

  await applyReferralBonus(user._id);

  res.json({ success: true });
});

router.post("/deposit/reject/:id", verifyToken, adminOnly, async (req, res) => {
  const dep = await Deposit.findById(req.params.id);
  dep.status = "Rejected";
  await dep.save();
  res.json({ success: true });
});


// ================= WITHDRAW =================
// ================= WITHDRAW =================

// GET WITHDRAWS
router.get("/withdraws", verifyToken, adminOrAgent, async (req, res) => {
  try {
    const data = await Withdraw.find()
      .populate("userId", "phone")
      .sort({ createdAt: -1 });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// APPROVE
router.post("/withdraw/approve/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    const wd = await Withdraw.findById(req.params.id);

    if (!wd) return res.status(404).json({ error: "Not found" });

    if (wd.status !== "Pending") {
      return res.json({ message: "Already processed" });
    }

    wd.status = "Approved";
    await wd.save();

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// REJECT + REFUND
router.post("/withdraw/reject/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    const wd = await Withdraw.findById(req.params.id);

    if (!wd) return res.status(404).json({ error: "Not found" });

    if (wd.status !== "Pending") {
      return res.json({ message: "Already processed" });
    }

    const user = await User.findById(wd.userId);

    if (user) {
      user.walletBalance += wd.amount;
      await user.save();
    }

    wd.status = "Rejected";
    await wd.save();

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= MATCH =================
router.post("/match/update-with-odds", verifyToken, adminOnly, async (req, res) => {
  let match = await Match.findOne();

  if (!match) match = new Match(req.body);
  else Object.assign(match, req.body);

  await match.save();

  const odds = calculateOdds(match);

  await LiveOdds.findOneAndUpdate({}, { match: match.matchName, odds }, { upsert: true });

  res.json({ odds });
});


// ================= BET RESULT (FINAL FIX) =================
router.post("/match/result", verifyToken, adminOnly, async (req, res) => {
  const { winner } = req.body;
  const bets = await Bet.find({ status: "pending" });

  for (let bet of bets) {
    const user = await User.findById(bet.userId);

    if (bet.selection === winner) {

      const winAmount = bet.potentialWin || 0;
      user.walletBalance += winAmount;

      // 🔥 DYNAMIC COMMISSION
      if (user.agentId) {
        const agent = await User.findById(user.agentId);

        if (agent) {
          const percent = agent.commissionPercent || 10;
          const commission = winAmount * (percent / 100);

          agent.commissionBalance += commission;
          await agent.save();
        }
      }

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


// ================= PAYMENT ADD =================
router.post("/upi/add", verifyToken, adminOnly, async (req,res)=>{
  const { upiId } = req.body;
  await UPI.create({ upiId });
  res.json({ success:true });
});

router.post("/mqr/add", verifyToken, adminOnly, async (req,res)=>{
  const { qrImage } = req.body;
  await MQR.create({ qrImage });
  res.json({ success:true });
});

router.post("/bank/add", verifyToken, adminOnly, async (req,res)=>{
  const { bankName, accountNumber, accountName, ifsc } = req.body;

  await Bank.create({
    bankName,
    accountNumber,
    accountName,
    ifsc
  });

  res.json({ success:true });
});


// ================= AGENT SYSTEM =================
router.get("/agents", verifyToken, adminOnly, async (req,res)=>{
  const agents = await User.find({ role:"agent" });
  res.json(agents);
});

router.post("/agent/assign", verifyToken, adminOnly, async (req,res)=>{
  const { userId, agentId } = req.body;
  await User.findByIdAndUpdate(userId, { agentId });
  res.json({ success:true });
});

router.get("/agent/users", verifyToken, async (req,res)=>{
  const user = await User.findById(req.user.id);

  if (user.role !== "agent") {
    return res.status(403).json({ error: "Access denied" });
  }

  const users = await User.find({ agentId: user._id });
  res.json(users);
});

router.get("/agent/commission", verifyToken, async (req,res)=>{
  const user = await User.findById(req.user.id);

  if (user.role !== "agent") {
    return res.status(403).json({ error: "Access denied" });
  }

  res.json({ commission: user.commissionBalance || 0 });
});

router.post("/agent/withdraw", verifyToken, async (req,res)=>{
  const user = await User.findById(req.user.id);

  if (user.role !== "agent") {
    return res.status(403).json({ error: "Access denied" });
  }

  user.walletBalance += user.commissionBalance;
  user.commissionBalance = 0;

  await user.save();

  res.json({ success:true });
});

export default router;