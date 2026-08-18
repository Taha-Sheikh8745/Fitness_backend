const express = require('express');
const router = express.Router();
const { exportToPDF, exportToCSV } = require('../controllers/exportController');
const { protect } = require('../middleware/authMiddleware');
const { checkSubscription } = require('../middleware/subscriptionMiddleware');

// PRO+ only — Data exports are a premium feature
router.get('/pdf', protect, checkSubscription('PRO'), exportToPDF);
router.get('/csv', protect, checkSubscription('PRO'), exportToCSV);

module.exports = router;
