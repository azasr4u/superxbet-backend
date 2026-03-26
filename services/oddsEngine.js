import express from "express";
import Score from "../models/Score.js";

const router = express.Router();

/// 🔥 IPL TEAMS (FIXED)
const teams = [
  "MI", "CSK", "RCB", "KKR", "GT",
  "SRH", "DC", "RR", "PBKS", "LSG",
];

/// 🔥 SAFE RANDOM MATCH (NO MUTATION)
function getRandomMatch() {
  const shuffled = [...teams].sort(() => 0.5 - Math.random());
  return {
    teamA: shuffled[0],
    teamB: shuffled[1],
  };
}

/// 🔥 CORE ODDS ENGINE
function calculateOdds(score) {

  let oddsA = 1.9;
  let oddsB = 1.9;

  if (!score) return { oddsA, oddsB };

  /// 🎯 MATCH SITUATION LOGIC

  // High score advantage
  if (score.totalRuns > 180) {
    oddsA = 1.5;
    oddsB = 2.5;
  }

  // Low score = balanced
  if (score.totalRuns < 140) {
    oddsA = 2.1;
    oddsB = 1.8;
  }

  // Wickets pressure
  if (score.wickets >= 5) {
    oddsA += 0.3;
    oddsB -= 0.2;
  }

  // Powerplay impact
  if (score.powerplayRuns > 60) {
    oddsA -= 0.2;
    oddsB += 0.2;
  }

  // Clamp values
  oddsA = Math.max(1.2, oddsA);
  oddsB = Math.max(1.2, oddsB);

  return {
    oddsA: Number(oddsA.toFixed(2)),
    oddsB: Number(oddsB.toFixed(2)),
  };
}

/// ================= LIVE ODDS =================
router.get("/live-odds", async (req, res) => {

  try {

    const score = await Score.findOne();

    let match;

    if (score && score.match) {
      const [teamA, teamB] = score.match.split(" vs ");
      match = { teamA, teamB };
    } else {
      match = getRandomMatch();
    }

    const { oddsA, oddsB } = calculateOdds(score);

    res.json({
      matchId: "IPL_" + Date.now(),
      league: "IPL",

      teamA: match.teamA,
      teamB: match.teamB,

      oddsA,
      oddsB,

      score: score || null,

      status: "LIVE",
      lastUpdate: new Date()
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;