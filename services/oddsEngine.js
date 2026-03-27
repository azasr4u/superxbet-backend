export function calculateOdds(match) {

  const { score, overs, wickets, target, innings } = match;

  let teamA = 1.9;
  let teamB = 1.9;

  /// 🟢 FIRST INNINGS (BALANCED)
  if (innings === 1) {

    if (score > 180) {
      teamA = 1.6;
      teamB = 2.4;
    }

    if (score < 140) {
      teamA = 2.2;
      teamB = 1.7;
    }

  }

  /// 🔴 SECOND INNINGS (REAL CALCULATION)
  else {

    const ballsPlayed = overs * 6;
    const ballsLeft = 120 - ballsPlayed;

    const runsNeeded = target - score;
    const requiredRR = runsNeeded / (ballsLeft / 6);
    const currentRR = score / overs;

    let strength = currentRR - requiredRR;

    /// wickets pressure
    if (wickets >= 5) strength -= 1;
    if (wickets >= 8) strength -= 2;

    /// death overs pressure
    if (overs > 16) {
      if (requiredRR > 10) strength -= 1.5;
      else strength += 0.5;
    }

    /// powerplay boost
    if (overs < 6 && wickets <= 1) {
      strength += 0.5;
    }

    teamA = 1.9 - strength * 0.25;
    teamB = 1.9 + strength * 0.25;
  }

  /// 🔒 CLAMP VALUES
  teamA = Math.max(1.2, Math.min(5, teamA));
  teamB = Math.max(1.2, Math.min(5, teamB));

  return {
    teamA: Number(teamA.toFixed(2)),
    teamB: Number(teamB.toFixed(2))
  };
}