import { applyReferralBonus } from "../services/referralService.js";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import Deposit from "../models/Deposit.js";
import Withdraw from "../models/Withdraw.js";
import User from "../models/User.js";
import KYC from "../models/KYC.js";
import LiveOdds from "../models/LiveOdds.js";

const router = express.Router();
const SECRET = "superxbet_secret";

// ================= AUTH =================
const verifyAdmin = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token" });

    const decoded = jwt.verify(token, SECRET);

    if (decoded.role !== "admin" && decoded.role !== "agent") {
      return res.status(403).json({ error: "Access denied" });
    }

    req.user = decoded;
    next();

  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

// ================= LOGIN =================
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

  res.json({ token });
});

// ================= DASHBOARD =================
router.get("/dashboard", verifyAdmin, async (req, res) => {

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
    withdraws: withdraws[0]?.total || 0,
    active: users
  });
});

// ================= USERS =================
router.get("/users", verifyAdmin, async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
});

router.post("/user/delete/:id", verifyAdmin, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

router.post("/user/block/:id", verifyAdmin, async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { blocked: true });
  res.json({ message: "Blocked" });
});

// ================= BONUS =================
router.post("/bonus", verifyAdmin, async (req, res) => {
  const { userId, amount } = req.body;

  await User.findByIdAndUpdate(userId, {
    $inc: { walletBalance: Number(amount) }
  });

  res.json({ message: "Bonus added" });
});

// ================= WAGER =================
router.post("/wager", verifyAdmin, async (req, res) => {
  const { userId, wager } = req.body;

  await User.findByIdAndUpdate(userId, {
    wageringRequired: Number(wager)
  });

  res.json({ message: "Updated" });
});

// ================= REFERRAL =================
router.get("/referral/:id", verifyAdmin, async (req, res) => {
  const users = await User.find({ referredBy: req.params.id });
  res.json(users);
});

// ================= BLOCKED =================
router.get("/blocked", verifyAdmin, async (req, res) => {
  const users = await User.find({ blocked: true });
  res.json(users);
});

// ================= DEPOSITS =================
router.get("/deposits", verifyAdmin, async (req, res) => {
  const deposits = await Deposit.find().populate("userId");
  res.json(deposits);
});

router.post("/deposit/approve/:id", verifyAdmin, async (req, res) => {

  const deposit = await Deposit.findById(req.params.id);

  if (!deposit) return res.status(404).json({ error: "Not found" });
  if (deposit.status !== "Pending") return res.status(400).json({ error: "Already processed" });

  deposit.status = "Approved";
  await deposit.save();

  const user = await User.findById(deposit.userId);
  user.walletBalance += deposit.amount;
  await user.save();

  await applyReferralBonus(user._id);

  res.json({ message: "Approved" });
});

// ================= WITHDRAW =================
router.get("/withdraws", verifyAdmin, async (req, res) => {
  const data = await Withdraw.find().populate("userId");
  res.json(data);
});

router.post("/withdraw/approve/:id", verifyAdmin, async (req, res) => {

  const withdraw = await Withdraw.findById(req.params.id);
  const user = await User.findById(withdraw.userId);

  if (user.wageringRequired > 0) {
    return res.status(400).json({ error: "Complete wagering first" });
  }

  if (user.walletBalance < withdraw.amount) {
    return res.status(400).json({ error: "Insufficient balance" });
  }

  user.walletBalance -= withdraw.amount;
  await user.save();

  withdraw.status = "Approved";
  await withdraw.save();

  res.json({ message: "Withdraw approved" });
});

// ================= KYC =================
router.get("/kyc", verifyAdmin, async (req, res) => {
  const data = await KYC.find({ status: "Pending" }).populate("userId");
  res.json(data);
});

router.post("/kyc/approve/:id", verifyAdmin, async (req, res) => {

  const kyc = await KYC.findById(req.params.id);

  kyc.status = "Approved";
  await kyc.save();

  await User.findByIdAndUpdate(kyc.userId, {
    kycVerified: true
  });

  res.json({ message: "Approved" });
});

router.post("/kyc/reject/:id", verifyAdmin, async (req, res) => {
  await KYC.findByIdAndDelete(req.params.id);
  res.json({ message: "Rejected" });
});

// ================= LIVE ODDS =================
router.post("/live-odds", verifyAdmin, async (req, res) => {

  const { match, odds } = req.body;

  await LiveOdds.findOneAndUpdate(
    {},
    { match, odds },
    { upsert: true }
  );

  res.json({ message: "Updated" });
});

export default router;