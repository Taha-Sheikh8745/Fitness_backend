const AIPlan = require('../models/AIPlan');
const Progress = require('../models/Progress');
const aiService = require('../services/aiService');
const crypto = require('crypto');
const cacheService = require('../services/cacheService');
const { logEvent } = require('../services/logService');

/**
 * Helper to generate a unique cache key.
 */
const generateCacheKey = (userId, profileData, progressData, type) => {
  const combinedData = { ...profileData, progressId: progressData?._id?.toString() || 'none' };
  const hash = crypto.createHash('md5').update(JSON.stringify(combinedData)).digest('hex');
  const date = new Date().toISOString().split('T')[0];
  return `ai:${type}:${userId}:${hash}:${date}`;
};

// @desc    Get AI Coach Recommendations (Workout + Nutrition)
// @route   GET /api/ai/coach
// @access  Private
const getAICoach = async (req, res, next) => {
  try {
    const user = req.user;
    const profileData = user.profileData;

    // ─── Validate that user has filled their health metrics ──────────────
    if (!profileData?.age || !profileData?.weight || !profileData?.height || !profileData?.goal) {
      return res.status(400).json({
        success: false,
        requiresProfile: true,
        message: 'Please complete your Health Metrics in Profile Settings before using AI Coach. Required: age, weight, height, and goal.'
      });
    }

    // ─── Fetch latest progress log for body measurements ─────────────────
    let latestProgress = null;
    try {
      latestProgress = await Progress.findOne({ user: user._id })
        .sort({ date: -1 })
        .select('weight bodyFatPercentage measurements date')
        .lean();
    } catch (progressErr) {
      console.warn('⚠️ Could not fetch progress data for AI:', progressErr.message);
    }

    const cacheKey = generateCacheKey(user._id, profileData, latestProgress, 'coach');
    const cachedData = cacheService.get(cacheKey);

    if (cachedData) {
      console.log(`📦 Serving cached AI plan for user ${user._id}`);
      return res.status(200).json({
        success: true,
        data: cachedData,
        cached: true
      });
    }

    // ─── Generate AI Plan ────────────────────────────────────────────────
    console.log(`🤖 Generating AI plan for user ${user._id}`);
    if (latestProgress) {
      console.log(`📊 Including progress data: weight=${latestProgress.weight}kg, date=${latestProgress.date}`);
    }

    let fullPlan;
    try {
      fullPlan = await aiService.generateFullPlan(profileData, latestProgress);
    } catch (aiError) {
      console.error('❌ AI generation failed:', aiError.message);
      return res.status(500).json({
        success: false,
        message: aiError.message || 'AI Coach is temporarily unavailable. Please try again.'
      });
    }

    // ─── Save to Database & Cache ────────────────────────────────────────
    try {
      await AIPlan.create({
        user: user._id,
        planType: 'Full',
        generatedPlan: fullPlan,
        userInputHash: cacheKey.split(':')[3]
      });
    } catch (dbErr) {
      console.warn('⚠️ Could not save AI plan to DB:', dbErr.message);
    }

    cacheService.set(cacheKey, fullPlan, 360); // Cache for 6 hours

    // Log the AI usage event
    await logEvent({
      event: 'AI_PLAN_GENERATED',
      message: `User ${user.email} generated an AI coach plan`,
      category: 'SYSTEM',
      user: user._id
    });

    res.status(200).json({
      success: true,
      data: fullPlan
    });

  } catch (error) {
    console.error('❌ AI Coach Error:', error.message);
    next(error);
  }
};

// @desc    Get AI Goal Recommendations
// @route   GET /api/ai/goals
// @access  Private
const getAIGoals = async (req, res, next) => {
  try {
    const user = req.user;
    const profileData = user.profileData;

    if (!profileData?.age || !profileData?.weight || !profileData?.goal) {
      return res.status(400).json({
        success: false,
        requiresProfile: true,
        message: 'Please complete your Health Metrics in Profile Settings first.'
      });
    }

    // Fetch latest progress for context
    let latestProgress = null;
    try {
      latestProgress = await Progress.findOne({ user: user._id })
        .sort({ date: -1 })
        .select('weight bodyFatPercentage')
        .lean();
    } catch (err) {
      console.warn('Could not fetch progress for goal AI:', err.message);
    }

    let goals;
    try {
      goals = await aiService.generateGoalRecommendation(profileData, latestProgress);
    } catch (aiError) {
      return res.status(500).json({
        success: false,
        message: aiError.message || 'AI Goal Advisor is temporarily unavailable.'
      });
    }

    await logEvent({
      event: 'AI_GOALS_GENERATED',
      message: `User ${user.email} generated AI goal recommendations`,
      category: 'SYSTEM',
      user: user._id
    });

    res.status(200).json({
      success: true,
      data: goals
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAICoach, getAIGoals };
