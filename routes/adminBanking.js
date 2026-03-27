import express from "express";
import User from "../models/User.js";

const router = express.Router();

// APPROVE DEPOSIT
router.post("/deposit/approve", async (req, res) => {
  const { userId, amount } = req.body;

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  user.balance += amount;
  await user.save();

  res.json({ message: "Deposit approved" });
});

// APPROVE WITHDRAW
router.post("/withdraw/approve", async (req, res) => {
  const { userId, amount } = req.body;

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (user.balance < amount) {
    return res.status(400).json({ error: "Insufficient balance" });
  }

  user.balance -= amount;
  await user.save();

  res.json({ message: "Withdraw approved" });
});

export default router;