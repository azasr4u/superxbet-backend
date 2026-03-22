import User from "../models/User.js";

export const settleBet = async (userId, winAmount) => {

  const user = await User.findById(userId);

  // 💰 add winnings
  user.walletBalance += winAmount;

  // 🔥 REDUCE WAGER USING WIN ONLY
  if (user.wageringRequired > 0) {

    user.wageringRequired -= winAmount;

    if (user.wageringRequired < 0) {
      user.wageringRequired = 0;
    }
  }

  await user.save();
};