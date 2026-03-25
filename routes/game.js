import express from "express";
import User from "../models/User.js";

const router = express.Router();

// 🎮 USER WIN EVENT
router.post("/win", async (req, res) => {
  try {
    const { userId, winAmount } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 💰 ADD WINNING TO WALLET
    user.walletBalance += winAmount;

    // 🎯 REDUCE WAGER USING WINNING ONLY
    if (user.wageringRequired > 0) {
      user.wageringRequired -= winAmount;

      if (user.wageringRequired < 0) {
        user.wageringRequired = 0;
      }
    }

    await user.save();

    res.json({
      message: "Win processed",
      wallet: user.walletBalance,
      wagerLeft: user.wageringRequired
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;