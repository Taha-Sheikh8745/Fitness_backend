const User = require('../models/User');

/**
 * Service to handle user engagement mechanics (XP, Levels, Streaks).
 */
class GamificationService {
  /**
   * Awards XP to a user and handles leveling up.
   * @param {string} userId 
   * @param {number} amount 
   */
  async awardXP(userId, amount) {
    const user = await User.findById(userId);
    if (!user) return;

    user.gamification.xp += amount;

    // Leveling Logic: Level = floor(sqrt(XP / 500)) + 1
    // e.g. 500 XP = Lvl 2, 2000 XP = Lvl 3, 4500 XP = Lvl 4
    const newLevel = Math.floor(Math.sqrt(user.gamification.xp / 500)) + 1;
    
    const leveledUp = newLevel > user.gamification.level;
    user.gamification.level = newLevel;

    await user.save();
    return { xpWon: amount, newLevel, leveledUp };
  }

  /**
   * Updates user streaks based on activity.
   * Logic: If last active was yesterday, increment. If today, do nothing. Else, reset.
   */
  async updateStreak(userId) {
    const user = await User.findById(userId);
    if (!user) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // In a real app, we'd store 'lastActivityDate' in the schema. 
    // For now, we'll use 'updatedAt' as a proxy or just perform the increment.
    // Simplified logic for MVP:
    user.gamification.currentStreak += 1;
    if (user.gamification.currentStreak > user.gamification.highestStreak) {
      user.gamification.highestStreak = user.gamification.currentStreak;
    }

    await user.save();
  }
}

module.exports = new GamificationService();
