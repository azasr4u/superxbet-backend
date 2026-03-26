import Bet from "../models/Bet.js";
import User from "../models/User.js";

export async function settleBets(score) {

  const bets = await Bet.find({ status: "pending" });

  for (let bet of bets) {

    let win = false;

    const type = bet.selections?.type;
    const sel = bet.selections?.selection;

    /// 🔥 MATCH WINNER
    if (type === "match_winner") {
      if (score.totalRuns > 180 && sel === "A") win = true;
    }

    /// 🔥 POWERPLAY
    if (type === "powerplay") {
      if (score.powerplayRuns > 65.5 && sel === "over") win = true;
    }

    /// 🔥 YES / NO
    if (type === "runout") {
      if (score.runOut === true && sel === "yes") win = true;
    }

    bet.status = win ? "won" : "lost";
    await bet.save();

    if (win) {
      const user = await User.findById(bet.userId);
      user.walletBalance += bet.potentialWin;
      await user.save();
    }
  }
}