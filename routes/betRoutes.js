const express = require("express");
const router = express.Router();

const Bet = require("../models/Bet");

/// 🔥 PLACE BET
router.post("/place", async (req, res) => {
  try {
    const { userId, match, selection, odds, stake } = req.body;

    if (!userId || !selection || !stake) {
      return res.status(400).json({ msg: "Invalid bet" });
    }

    const winAmount = stake * odds;

    const bet = new Bet({
      userId,
      match,
      selection,
      odds,
      stake,
      winAmount,
    });

    await bet.save();

    res.json({
      msg: "Bet placed successfully ✅",
      bet,
    });

  } catch (error) {
    res.status(500).json({ msg: "Server error" });
  }
});


/// 🔥 GET ALL BETS
router.get("/all", async (req, res) => {
  const bets = await Bet.find().sort({ createdAt: -1 });
  res.json(bets);
});

module.exports = router;