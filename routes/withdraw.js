import express from "express";
import Withdraw from "../models/Withdraw.js";
import User from "../models/User.js";

const router = express.Router();

// REQUEST WITHDRAW
router.post("/", async (req, res) => {
  try {
    const { userId, amount } = req.body;

    const user = await User.findById(userId);

    if (user.wageringRequired > 0) {
      return res.status(400).json({
        error: `Complete wager ₹${user.wageringRequired}`
      });
    }

    if (user.walletBalance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }
    user.walletBalance -= amount;
      await user.save();

    const withdraw = new Withdraw({
      userId,
      amount
    });

    await withdraw.save();

    res.json({ message: "Withdraw requested" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;