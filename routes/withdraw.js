import express from "express";
import Withdraw from "../models/Withdraw.js";
import User from "../models/User.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // ✅ FIXED: accept full data
    const { amount, method, details } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // ✅ FIXED: validate details (minimal)
    if (!details || !details.upiId) {
      return res.status(400).json({ error: "UPI ID required" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    if ((user.wageringRequired || 0) > 0) {
      return res.status(400).json({
        error: `Complete wager ₹${user.wageringRequired}`
      });
    }

    if ((user.walletBalance || 0) < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // ✅ deduct balance
    user.walletBalance -= amount;
    await user.save();

    // ✅ FIXED: save method + details
    const withdraw = await Withdraw.create({
      user: userId,
      amount,
      method,
      details,
      status: "pending"
    });

    res.json({
      success: true,
      message: "Withdraw requested",
      withdraw
    });

  } catch (err) {
    console.log("WITHDRAW ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});
router.get("/my", verifyToken, async (req, res) => {
  const deposits = await Deposit.find({ userId: req.user.id })
    .sort({ createdAt: -1 });

  res.json(deposits);
});
export default router;