const express = require("express");
const router = express.Router();

const { getLiveScore } = require("../services/scoreService");
const { calculateOdds } = require("../services/oddsEngine");

router.get("/live", (req, res) => {

  const score = getLiveScore();
  const odds = calculateOdds(score);

  res.json({
    ...score,
    odds
  });
});

module.exports = router;