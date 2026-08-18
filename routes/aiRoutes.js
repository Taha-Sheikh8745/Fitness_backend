const express = require('express');
const router = express.Router();
const { getAICoach, getAIGoals } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');
const { checkSubscription } = require('../middleware/subscriptionMiddleware');

// PRO + ELITE can access the coach
router.get('/coach', protect, checkSubscription('PRO'), getAICoach);

// ONLY ELITE can access goal recommendations
router.get('/goals', protect, checkSubscription('ELITE'), getAIGoals);

module.exports = router;
