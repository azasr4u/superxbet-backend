import User from "../models/User.js";

// call this after deposit success
export const applyReferralBonus = async (userId) => {

  const user = await User.findById(userId);

  if (user.referredBy && !user.referralRewarded) {

    const refUser = await User.findOne({
      referralCode: user.referredBy
    });

    if (refUser) {

      // 🎁 BONUS
      refUser.bonusBalance += 3000;

      // 🎯 WAGER REQUIREMENT
      refUser.wageringRequired += 3000 * 35;

      await refUser.save();

      user.referralRewarded = true;
      await user.save();
    }
  }
};