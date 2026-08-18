const express = require('express');
const router = express.Router();
const { getGlobalSearch } = require('../controllers/searchController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getGlobalSearch);

module.exports = router;
