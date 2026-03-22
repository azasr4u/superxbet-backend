import User from "../models/User.js";

// 🎯 HANDLE WINNING LOGIC
export const handleWin = async (userId, winAmount) => {
  try {
    const user = await User.findById(userId);

    let remainingWin = winAmount;

    // 🔥 1. Reduce wagering first
    if (user.wageringRequired > 0) {
      const deduction = Math.min(user.wageringRequired, remainingWin);

      user.wageringRequired -= deduction;
      remainingWin -= deduction;
    }

    // 🔥 2. If wager completed → convert bonus
    if (user.wageringRequired <= 0 && user.bonusBalance > 0) {
      user.walletBalance += user.bonusBalance;
      user.bonusBalance = 0;
    }

    // 🔥 3. Add remaining winnings to real balance
    user.walletBalance += remainingWin;

    await user.save();

    console.log("✅ Win processed");

  } catch (err) {
    console.log("Win Error:", err);
  }
};