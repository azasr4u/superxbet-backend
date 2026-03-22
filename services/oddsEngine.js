import express from "express";

const router = express.Router();

// IPL Teams
const teams = [
  "MI", "CSK", "RCB", "KKR", "GT",
  "SRH", "DC", "RR", "PBKS" "LSG",
];

// Generate random match
function getRandomMatch() {
  const shuffled = teams.sort(() => 0.5 - Math.random());
  return {
    teamA: shuffled[0],
    teamB: shuffled[1],
  };
}

router.get("/live-odds", (req, res) => {
  const match = getRandomMatch();

  const odds = {
    matchId: "IPL_" + Date.now(),
    league: "IPL",
    teamA: match.teamA,
    teamB: match.teamB,
    oddsA: (1.2 + Math.random() * 2).toFixed(2),
    oddsB: (1.2 + Math.random() * 2).toFixed(2),
    status: "LIVE",
    lastUpdate: new Date()
  };

  res.json(odds);
});

export default router;