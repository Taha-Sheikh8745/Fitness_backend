const express = require('express');
const router = express.Router();
const { getDashboardData, getGlobalSearch } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

router.get('/search', protect, getGlobalSearch);
router.get('/', protect, getDashboardData);

module.exports = router;
