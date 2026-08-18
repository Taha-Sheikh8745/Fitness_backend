const express = require('express');
const router = express.Router();
const { predictWeight, getFullReport } = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

router.get('/predict-weight', protect, predictWeight);
router.get('/report', protect, getFullReport);

module.exports = router;
