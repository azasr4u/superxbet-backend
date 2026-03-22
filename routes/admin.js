import express from "express";
import Deposit from "../models/Deposit.js";
import Withdraw from "../models/Withdraw.js";
import User from "../models/User.js";
import { applyReferralBonus } from "../services/referralService.js";

const router = express.Router();

// ================= LOGIN =================
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({
      $or: [
        { phone: username },
        { email: username }
      ]
    });

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    // 🔥 ONLY ADMIN / AGENT
    if (user.role !== "admin" && user.role !== "agent") {
      return res.status(403).json({ error: "Access denied" });
    }

    const bcrypt = await import("bcryptjs");
    const isMatch = await bcrypt.default.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Wrong password" });
    }

    const jwt = await import("jsonwebtoken");

    const token = jwt.default.sign(
      { id: user._id, role: user.role },
      "superxbet_secret"
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
router.get("/deposits", async (req, res) => {
  const deposits = await Deposit.find().populate("userId");
  res.json(deposits);
});


// ================= APPROVE DEPOSIT =================
router.post("/deposit/approve/:id", async (req, res) => {

  const deposit = await Deposit.findById(req.params.id);

  if (!deposit) return res.status(404).json({ error: "Deposit not found" });
  if (deposit.status !== "Pending") return res.status(400).json({ error: "Already processed" });
  if (req.user.role === "agent") {
  return res.status(403).json({ error: "Agent not allowed" });
}

  deposit.status = "Approved";
  await deposit.save();

  const user = await User.findById(deposit.userId);

  user.walletBalance += deposit.amount;

  if (!user.isFirstDeposit) {
    user.isFirstDeposit = true;
    await applyReferralBonus(user._id); // 🎁 only first deposit
  }

  await user.save();

  res.json({ message: "Deposit approved" });
});


// ================= REJECT DEPOSIT =================
router.post("/deposit/reject/:id", async (req, res) => {
  const deposit = await Deposit.findById(req.params.id);

  if (!deposit) return res.status(404).json({ error: "Not found" });

  deposit.status = "Rejected";
  await deposit.save();

  res.json({ message: "Rejected" });
});


// ================= GET WITHDRAWS =================
router.get("/withdraws", async (req, res) => {
  const data = await Withdraw.find().populate("userId");
  res.json(data);
});


// ================= APPROVE WITHDRAW =================
router.post("/withdraw/approve/:id", async (req, res) => {

  const withdraw = await Withdraw.findById(req.params.id);

  if (!withdraw) return res.status(404).json({ error: "Not found" });
  if (req.user.role === "agent") {
  return res.status(403).json({ error: "Agent not allowed" });
}

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
router.post("/withdraw/reject/:id", async (req, res) => {

  const withdraw = await Withdraw.findById(req.params.id);

  if (!withdraw) return res.status(404).json({ error: "Not found" });

  withdraw.status = "Rejected";
  await withdraw.save();

  res.json({ message: "Rejected" });
});

export default router;