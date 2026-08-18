const express = require('express');
const router = express.Router();
const {
  registerUser,
  resendOTP,
  verifyOTP,
  loginUser,
  refreshToken,
  logoutUser,
  forgotPassword,
  resetPassword,
  googleOAuthLogin
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/resend-otp', resendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/login', loginUser);
router.post('/google', googleOAuthLogin);
router.post('/refresh', refreshToken);
router.post('/logout', protect, logoutUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Scaffold for Google OAuth
router.post('/google', googleOAuthLogin);

module.exports = router;
