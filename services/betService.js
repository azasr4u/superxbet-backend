import User from "../models/User.js";

export const settleBet = async (userId, stake, winAmount, isWin) => {

  const user = await User.findById(userId);

  if (!user) throw new Error("User not found");

  // 💰 add win only if win
  if (isWin) {
    user.walletBalance += winAmount;
  }

  // 🎯 reduce wager by stake
  if (user.wageringRequired > 0) {
    user.wageringRequired -= stake;

    if (user.wageringRequired < 0) {
      user.wageringRequired = 0;
    }
  }

  await user.save();
};