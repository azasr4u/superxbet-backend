const express = require("express");
const router = express.Router();
const Bet = require("../models/Bet");

/// 🔥 PLACE BET (FIXED)
router.post("/place", async (req, res) => {
  try {
    const { userId, match, selection, odds, stake } = req.body;

    if (!userId || !selection || !stake) {
      return res.status(400).json({ msg: "Invalid bet" });
    }

    const potentialWin = stake * odds;

    const bet = new Bet({
      userId,
      match,

      /// ✅ FIXED FIELD
      selection: selection,

      odds: odds,
      stake: stake,

      /// ✅ FIXED NAME
      potentialWin: potentialWin,

      status: "pending"
    });

    await bet.save();

    res.json({
      success: true,
      msg: "Bet placed successfully ✅",
      bet,
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});


/// 🔥 GET MY BETS (IMPORTANT FIX)
router.get("/my/:userId", async (req, res) => {
  try {
    const bets = await Bet.find({ userId: req.params.userId })
      .sort({ createdAt: -1 });

    res.json(bets);

  } catch (error) {
    res.status(500).json({ msg: "Error fetching bets" });
  }
});

module.exports = router;