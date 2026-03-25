import { applyReferralBonus } from "../services/referralService.js";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import Deposit from "../models/Deposit.js";
import Withdraw from "../models/Withdraw.js";
import User from "../models/User.js";

const router = express.Router();

const SECRET = "superxbet_secret";

// ================= MIDDLEWARE (AUTH) =================
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

  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// ================= LOGIN =================
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({
      $or: [{ phone: username }, { email: username }]
    });

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    // ✅ ONLY ADMIN / AGENT CAN LOGIN
    if (user.role !== "admin" && user.role !== "agent") {
      return res.status(403).json({ error: "Access denied" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Wrong password" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      role: user.role,
      name: user.fullName
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ================= GET DEPOSITS =================
router.get("/deposits", verifyAdmin, async (req, res) => {
  const deposits = await Deposit.find().populate("userId");
  res.json(deposits);
});


// ================= APPROVE DEPOSIT =================
router.post("/deposit/approve/:id", verifyAdmin, async (req, res) => {

  const deposit = await Deposit.findById(req.params.id);

  if (!deposit) return res.status(404).json({ error: "Deposit not found" });
  if (deposit.status !== "Pending") return res.status(400).json({ error: "Already processed" });

  deposit.status = "Approved";
  await deposit.save();

  const user = await User.findById(deposit.userId);

  user.walletBalance += deposit.amount;

    await user.save();

    await applyReferralBonus(user._id);

  res.json({ message: "Deposit approved" });
});


// ================= REJECT DEPOSIT =================
router.post("/deposit/reject/:id", verifyAdmin, async (req, res) => {

  const deposit = await Deposit.findById(req.params.id);

  if (!deposit) return res.status(404).json({ error: "Not found" });

  deposit.status = "Rejected";
  await deposit.save();

  res.json({ message: "Rejected" });
});


// ================= GET WITHDRAWS =================
router.get("/withdraws", verifyAdmin, async (req, res) => {
  const data = await Withdraw.find().populate("userId");
  res.json(data);
});


// ================= APPROVE WITHDRAW =================
router.post("/withdraw/approve/:id", verifyAdmin, async (req, res) => {

  const withdraw = await Withdraw.findById(req.params.id);

  if (!withdraw) return res.status(404).json({ error: "Not found" });

  const user = await User.findById(withdraw.userId);

  // 🚫 WAGER CHECK
  if (user.wageringRequired > 0) {
    return res.status(400).json({
      error: "Complete wagering first",
      remaining: user.wageringRequired
    });
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


// ================= REJECT WITHDRAW =================
router.post("/withdraw/reject/:id", verifyAdmin, async (req, res) => {

  const withdraw = await Withdraw.findById(req.params.id);

  if (!withdraw) return res.status(404).json({ error: "Not found" });

  withdraw.status = "Rejected";
  await withdraw.save();

  res.json({ message: "Rejected" });
});

export default router;