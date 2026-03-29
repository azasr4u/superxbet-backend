import express from "express";
import Match from "../models/Match.js"; // ✅ FIXED

const router = express.Router();

// 🎯 ODDS ENGINE (KEEP SAME LOGIC)
function calculateOdds(match) {
  const base = 1.9;

  const overs = match.overs || 1;
  const performanceFactor = match.score / (overs * 6);

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

// 🔁 LIVE ODDS API (FINAL)
router.get("/live", async (req, res) => {
  try {

    // 🔥 GET LIVE MATCH FIRST
    let match = await Match.findOne({ isLive: true });

    // 🔁 IF NO LIVE MATCH → GET LAST MATCH
    if (!match) {
      match = await Match.findOne().sort({ updatedAt: -1 });
    }

    if (!match) {
      return res.json({
        match: null,
        odds: null
      });
    }

    // ✅ MAP TO FLUTTER FORMAT
    const matchData = {
      teamA: match.teamA || "Team A",
      teamB: match.teamB || "Team B",
      scoreA: match.score || 0,
      wicketsA: match.wickets || 0,
      overs: match.overs || 0,
      result: match.result || "",
      status: match.isLive ? "LIVE" : "ENDED"
    };

    // 🔴 MATCH ENDED
    if (!match.isLive) {
      return res.json({
        match: matchData,
        odds: null
      });
    }

    // 🟢 LIVE MATCH
    const odds = calculateOdds(match);

    res.json({
      match: matchData,
      odds,
      lastUpdate: new Date()
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;