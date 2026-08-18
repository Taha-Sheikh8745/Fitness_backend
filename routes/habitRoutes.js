const express = require('express');
const router = express.Router();
const { getHabits, updateHabit } = require('../controllers/habitController');
const { protect } = require('../middleware/authMiddleware');
const { checkSubscription } = require('../middleware/subscriptionMiddleware');

router.use(protect);

// PRO+ only — Habit tracking is a premium feature
router.route('/')
    .get(checkSubscription('PRO'), getHabits)
    .post(checkSubscription('PRO'), updateHabit);

module.exports = router;
