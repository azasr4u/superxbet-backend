const express = require("express");
const router = express.Router();
const Bet = require("../models/Bet");
const User = require("../models/User");
const auth = require("../middleware/auth");

/// 🔥 PLACE BET WITH WALLET DEDUCTION
router.post("/place", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { match, selection, selections, odds, stake } = req.body;

    if (!selection || !stake) {
      return res.status(400).json({ msg: "Invalid bet" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    /// 🔥 CHECK BALANCE
    if (user.walletBalance < stake) {
      return res.status(400).json({ msg: "Insufficient balance" });
    }

    /// 🔥 DEDUCT WALLET
    user.walletBalance -= stake;
    await user.save();

    /// 🔥 CREATE BET
    const bet = new Bet({
      userId,
      match,
      selection,
      selections: selections || null,
      odds,
      stake,
      potentialWin: stake * odds,
      status: "pending",
    });

    await bet.save();

    res.json({
      success: true,
      msg: "Bet placed",
      walletBalance: user.walletBalance,
      bet,
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server error" });
  }
});

/// 🔥 GET MY BETS
router.get("/my", auth, async (req, res) => {
  try {
    const bets = await Bet.find({ userId: req.user.id })
      .sort({ createdAt: -1 });

    res.json(bets);
  } catch (err) {
    res.status(500).json({ msg: "Error fetching bets" });
  }
});

module.exports = router;