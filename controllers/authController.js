const User = require('../models/User');
const OTP = require('../models/OTP');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const sendEmail = require('../utils/emailService');
const { generateToken, generateRefreshToken } = require('../utils/generateToken');
const { generateOTPEmailTemplate, generateWelcomeEmailTemplate } = require('../utils/emailTemplates');
const { OAuth2Client } = require('google-auth-library');
const { logEvent } = require('../services/logService');
const { getRefreshTokenCookieOptions } = require('../utils/cookieOptions');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate 6 digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      if (!userExists.isVerified) {
        // Resend OTP if user exists but not verified
        const otp = generateOTP();
        await OTP.findOneAndUpdate(
          { email },
          { otp, createdAt: Date.now() },
          { upsert: true, new: true }
        );
        
        console.log(`\n🔑 [FitForge OTP] Verification code for ${email}: ${otp}\n`);

        try {
          await sendEmail({
            email,
            subject: 'FitForge AI - Verification Code',
            message: `Your verification code is: ${otp}. It will expire in 5 minutes.`,
            html: generateOTPEmailTemplate(otp),
          });
        } catch (emailErr) {
          console.warn('⚠️ OTP email send warning:', emailErr.message);
        }

        return res.status(200).json({ 
          success: true, 
          message: 'User exists but not verified. New OTP generated.', 
          requireVerification: true,
          devOtp: otp
        });
      }
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await User.create({
      name,
      email,
      password: hashedPassword,
      isVerified: false,
    });

    const otp = generateOTP();
    await OTP.create({ email, otp });

    console.log(`\n🔑 [FitForge OTP] Verification code for ${email}: ${otp}\n`);

    try {
      await sendEmail({
        email,
        subject: 'FitForge AI - Verification Code',
        message: `Your verification code is: ${otp}. It will expire in 5 minutes.`,
        html: generateOTPEmailTemplate(otp),
      });
    } catch (emailErr) {
      console.warn('⚠️ Email send warning during registration:', emailErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      requireVerification: true,
      devOtp: otp
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error during registration' });
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'User is already verified' });
    }

    const otp = generateOTP();
    await OTP.findOneAndUpdate(
      { email },
      { otp, createdAt: Date.now() },
      { upsert: true, new: true }
    );

    console.log(`\n🔑 [FitForge OTP] Resent code for ${email}: ${otp}\n`);

    try {
      await sendEmail({
        email,
        subject: 'FitForge AI - New Verification Code',
        message: `Your verification code is: ${otp}. It will expire in 5 minutes.`,
        html: generateOTPEmailTemplate(otp),
      });
    } catch (e) {
      console.warn('⚠️ Resend email warning:', e.message);
    }

    res.status(200).json({
      success: true,
      message: 'New verification code generated.',
      devOtp: otp
    });
  } catch (error) {
    console.error('Resend OTP Error:', error);
    res.status(500).json({ success: false, message: 'Server error resending OTP' });
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const otpRecord = await OTP.findOne({ email });
    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'OTP expired or not found' });
    }

    if (otpRecord.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    user.isVerified = true;
    await user.save();

    await OTP.deleteOne({ email }); // clear OTP

    // Send Welcome Email
    try {
      await sendEmail({
        email,
        subject: 'Welcome to FitForge AI!',
        message: 'Your account is verified. Welcome!',
        html: generateWelcomeEmailTemplate(user.name),
      });
    } catch(err) {
      console.log('Welcome email failed, but verification succeeded.', err);
    }

    res.status(200).json({ success: true, message: 'Verification successful. You can now login.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ success: false, message: 'Please verify your email first', requireVerification: true });
    }

    if (!user.password) {
      return res.status(401).json({ success: false, message: 'Please login using Google' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    // Log the login event
    await logEvent({
      event: 'LOGIN_SUCCESS',
      message: `User ${user.email} logged in successfully`,
      category: 'AUTH',
      user: user._id
    });

    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions({
      maxAge: 7 * 24 * 60 * 60 * 1000,
    }));

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        fitnessGoals: user.fitnessGoals,
        role: user.role,
        isVerified: user.isVerified,
        gamification: user.gamification,
        profileData: user.profileData,
        preferences: user.preferences,
        createdAt: user.createdAt,
      },
      accessToken,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Refresh Token
// @route   POST /api/auth/refresh
// @access  Public
const refreshToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, no refresh token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const accessToken = generateToken(user._id);

    res.status(200).json({
      success: true,
      accessToken,
    });
  } catch (error) {
    console.error(error);
    res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Public
const logoutUser = async (req, res) => {
  if (req.user) {
    await logEvent({
      event: 'LOGOUT',
      message: `User ${req.user.email} logged out`,
      category: 'AUTH',
      user: req.user._id
    });
  }
  res.cookie('refreshToken', '', getRefreshTokenCookieOptions({
    expires: new Date(0),
  }));
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const otp = generateOTP();
    await OTP.findOneAndUpdate(
      { email },
      { otp, createdAt: Date.now() },
      { upsert: true, new: true }
    );

    await sendEmail({
      email,
      subject: 'FitForge AI - Password Reset Code',
      message: `Your password reset code is: ${otp}. It will expire in 5 minutes.`,
      html: generateOTPEmailTemplate(otp),
    });

    res.status(200).json({ success: true, message: 'Password reset code sent to email.' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const otpRecord = await OTP.findOne({ email });
    if (!otpRecord || otpRecord.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    await OTP.deleteOne({ email });

    res.status(200).json({ success: true, message: 'Password has been reset successfully.' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


// Google OAuth 
const googleOAuthLogin = async (req, res) => {
  try {
    const { token } = req.body; 
    let googleId, email, name, avatar;

    const isGoogleConfigured = process.env.GOOGLE_CLIENT_ID && 
      process.env.GOOGLE_CLIENT_ID !== 'placeholder_client_id' && 
      !process.env.GOOGLE_CLIENT_ID.includes('your_google_client_id');

    if (isGoogleConfigured && token) {
      try {
        // useGoogleLogin provides an access_token, so we fetch the profile from userinfo
        const { data } = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` }
        });
        googleId = data.sub;
        email = data.email;
        name = data.name;
        avatar = data.picture;
      } catch (e) {
        console.warn('⚠️ Google token verification failed, using dev Google profile fallback:', e.message);
        if (process.env.NODE_ENV !== 'production') {
          googleId = 'google_user_' + Date.now();
          email = 'google.user@fitforge.ai';
          name = 'Google User';
          avatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150';
        } else {
          return res.status(401).json({ success: false, message: 'Invalid Google access token' });
        }
      }
    } else {
      // Fallback for development mode when Google OAuth credentials are not fully configured
      console.log('ℹ️ Google OAuth using development mode profile fallback');
      googleId = 'google_user_' + Date.now();
      email = 'google.user@fitforge.ai';
      name = 'Google User';
      avatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150';
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        googleId,
        avatar,
        isVerified: true, // Auto verified
      });

      // Send conditional welcome
      try {
        await sendEmail({
          email,
          subject: 'Welcome to FitForge AI!',
          message: 'Your account is verified via Google. Welcome!',
          html: generateWelcomeEmailTemplate(name),
        });
      } catch(e) {}
    }

    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    // Log the login event
    await logEvent({
      event: 'GOOGLE_LOGIN_SUCCESS',
      message: `User ${user.email} logged in via Google`,
      category: 'AUTH',
      user: user._id
    });

    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions({
      maxAge: 7 * 24 * 60 * 60 * 1000,
    }));

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        fitnessGoals: user.fitnessGoals,
        role: user.role,
        isVerified: user.isVerified,
        gamification: user.gamification,
        profileData: user.profileData,
        preferences: user.preferences,
        createdAt: user.createdAt,
      },
      accessToken,
    });

  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ success: false, message: 'Google authentication error: ' + error.message });
  }
};

module.exports = {
  registerUser,
  resendOTP,
  verifyOTP,
  loginUser,
  refreshToken,
  logoutUser,
  forgotPassword,
  resetPassword,
  googleOAuthLogin
};
