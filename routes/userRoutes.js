const express = require('express');
const router = express.Router();
const { 
  getUserProfile, 
  updateUserProfile, 
  deleteUserProfile,
  checkCloudinaryStatus 
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// All routes are protected
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile)
  .delete(protect, deleteUserProfile);

// Cloudinary status check
router.get('/cloudinary-status', protect, checkCloudinaryStatus);

module.exports = router;