export function updateScore(match, action) {

  /// RUNS
  if ([1,2,3,4,6].includes(action)) {
    match.score += action;
    match.balls += 1;
  }

  /// EXTRA
  if (action === "wide" || action === "noball") {
    match.score += 1;
  }

  /// WICKET
  if (action === "wicket") {
    match.wickets += 1;
    match.balls += 1;
  }

  /// BALL LOGIC
  if (match.balls >= 6) {
    match.overs += 1;
    match.balls = 0;
  }

  return match;
}