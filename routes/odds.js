import express from "express";

const router = express.Router();

// 🏏 Match state (mock score engine for now)
let matchState = {
  teamA: "RCB",
  teamB: "SRH",
  scoreA: 85,
  scoreB: 0,
  wicketsA: 2,
  overs: 10.2
};

// 🎯 ODDS ENGINE (simple logic now, upgrade later)
function calculateOdds() {
  const base = 1.9;

  const performanceFactor =
    matchState.scoreA / (matchState.overs * 6);

  let oddsA = base - performanceFactor * 0.2;
  let oddsB = base + performanceFactor * 0.2;

  return {
    matchWinner: {
      teamA: oddsA.toFixed(2),
      teamB: oddsB.toFixed(2)
    },

    over1: {
      over: "1st Over 6.5+",
      overOdds: "1.95",
      underOdds: "2.10"
    },

    powerplay: {
      line: "65.5",
      overOdds: "1.90",
      underOdds: "1.95"
    },

    totalScore: {
      line: "180.5",
      overOdds: "1.85",
      underOdds: "2.05"
    },

    wickets: {
      line: "5.5",
      overOdds: "2.00",
      underOdds: "1.80"
    },

    events: {
      runOut: { yes: "11.95", no: "1.20" },
      catchDrop: { yes: "4.95", no: "1.40" },
      bowled: { yes: "3.95", no: "1.60" }
    }
  };
}

// 🔁 LIVE ODDS API
router.get("/live", (req, res) => {
  const odds = calculateOdds();

  res.json({
    match: matchState,
    odds,
    lastUpdate: new Date()
  });
});

export default router;