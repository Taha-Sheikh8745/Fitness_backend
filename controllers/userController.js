const User = require('../models/User');
const Workout = require('../models/Workout');
const Nutrition = require('../models/Nutrition');
const Progress = require('../models/Progress');
const { logEvent } = require('../services/logService');
const { getRefreshTokenCookieOptions } = require('../utils/cookieOptions');

// Only import cloudinary if credentials exist
let cloudinary = null;
let isCloudinaryConfigured = false;

// Safely configure Cloudinary
const configureCloudinary = () => {
  try {
    // Check if credentials exist
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
    
    console.log('🔧 Checking Cloudinary credentials...');
    console.log('CLOUDINARY_CLOUD_NAME exists:', !!CLOUDINARY_CLOUD_NAME);
    console.log('CLOUDINARY_API_KEY exists:', !!CLOUDINARY_API_KEY);
    console.log('CLOUDINARY_API_SECRET exists:', !!CLOUDINARY_API_SECRET);
    
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      console.warn('⚠️ Cloudinary credentials missing - image upload will be disabled');
      return false;
    }
    
    // Dynamically import cloudinary
    cloudinary = require('cloudinary').v2;
    
    cloudinary.config({ 
      cloud_name: CLOUDINARY_CLOUD_NAME, 
      api_key: CLOUDINARY_API_KEY, 
      api_secret: CLOUDINARY_API_SECRET 
    });
    
    console.log('✅ Cloudinary configured successfully');
    console.log(`📁 Cloud Name: ${CLOUDINARY_CLOUD_NAME}`);
    return true;
  } catch (error) {
    console.error('❌ Cloudinary configuration error:', error.message);
    return false;
  }
};

// Initialize configuration
isCloudinaryConfigured = configureCloudinary();

// Helper function to create notification
const createNotification = async (userId, message, type) => {
  try {
    console.log(`📧 Notification for user ${userId}: ${message}`);
    // Implement your notification logic here
  } catch (error) {
    console.error('Notification error:', error);
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password -googleId');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    res.status(200).json({ 
      success: true, 
      data: user 
    });
  } catch (error) {
    console.error('Get profile error:', error);
    next(error);
  }
};

// @desc    Update user profile & avatar
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res, next) => {
  try {
    console.log('📝 Update profile request received');
    
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Update basic fields
    if (req.body.name !== undefined) {
      user.name = req.body.name.trim();
    }
    
    if (req.body.fitnessGoals !== undefined) {
      user.fitnessGoals = req.body.fitnessGoals.trim();
    }
    
    if (req.body.preferences) {
      user.preferences = {
        ...user.preferences,
        ...req.body.preferences
      };
    }

    if (req.body.profileData) {
      user.profileData = {
        ...user.profileData,
        ...req.body.profileData
      };
    }

    // Handle avatar upload
    if (req.body.avatarBase64) {
      console.log('📸 Avatar upload requested');
      
      // Check if Cloudinary is configured
      if (!isCloudinaryConfigured || !cloudinary) {
        console.error('❌ Cloudinary not configured - attempting to reconfigure');
        isCloudinaryConfigured = configureCloudinary();
        
        if (!isCloudinaryConfigured || !cloudinary) {
          return res.status(503).json({ 
            success: false, 
            message: 'Image upload service is not configured. Please contact support.' 
          });
        }
      }

      try {
        // Validate base64 string
        if (!req.body.avatarBase64 || !req.body.avatarBase64.includes('base64')) {
          return res.status(400).json({
            success: false,
            message: 'Invalid image format. Please provide a valid image.'
          });
        }

        // If user already has an avatar, delete the old one
        if (user.avatar && user.avatar.includes('cloudinary')) {
          try {
            const urlParts = user.avatar.split('/');
            const filename = urlParts[urlParts.length - 1];
            const publicIdWithExt = filename.split('.')[0];
            const publicId = `fitforge_avatars/${publicIdWithExt}`;
            
            console.log('🗑️ Deleting old avatar:', publicId);
            await cloudinary.uploader.destroy(publicId);
            console.log('✅ Old avatar deleted');
          } catch (deleteError) {
            console.warn('⚠️ Failed to delete old avatar:', deleteError.message);
          }
        }

        // Upload new avatar
        console.log('📤 Uploading avatar to Cloudinary...');
        
        const uploadResponse = await cloudinary.uploader.upload(req.body.avatarBase64, {
          folder: 'fitforge_avatars',
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' }
          ],
          allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
          timeout: 60000
        });
        
        user.avatar = uploadResponse.secure_url;
        console.log('✅ Avatar uploaded successfully');
        
      } catch (uploadError) {
        console.error('❌ Cloudinary upload error:', uploadError.message);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to upload image: ' + uploadError.message 
        });
      }
    }

    const updatedUser = await user.save();
    console.log('✅ User profile updated');

    // Log audit event
    await logEvent({
      event: 'PROFILE_UPDATE',
      message: `User ${user.email} updated their profile settings`,
      category: 'USER',
      user: user._id
    });

    // Create notification (don't fail if this errors)
    try {
      await createNotification(
        req.user._id,
        'Your profile was successfully updated.',
        'Profile'
      );
    } catch (notifError) {
      console.warn('⚠️ Failed to create notification:', notifError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        fitnessGoals: updatedUser.fitnessGoals,
        preferences: updatedUser.preferences,
        role: updatedUser.role,
        isVerified: updatedUser.isVerified,
        subscription: updatedUser.subscription,
        gamification: updatedUser.gamification,
        profileData: updatedUser.profileData,
        createdAt: updatedUser.createdAt
      },
    });

  } catch (error) {
    console.error('❌ Update profile error:', error);
    next(error);
  }
};

// @desc    Delete user account
// @route   DELETE /api/users/profile
// @access  Private
const deleteUserProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Delete user's Cloudinary avatar if configured
    if (user.avatar && user.avatar.includes('cloudinary') && isCloudinaryConfigured && cloudinary) {
      try {
        const urlParts = user.avatar.split('/');
        const filename = urlParts[urlParts.length - 1];
        const publicIdWithExt = filename.split('.')[0];
        const publicId = `fitforge_avatars/${publicIdWithExt}`;
        await cloudinary.uploader.destroy(publicId);
        console.log('✅ Avatar deleted from Cloudinary');
      } catch (cloudinaryError) {
        console.error('⚠️ Failed to delete avatar:', cloudinaryError.message);
      }
    }

    // Log audit event before deletion
    await logEvent({
      event: 'ACCOUNT_DELETED',
      message: `User ${user.email} deleted their account`,
      category: 'USER',
      user: userId
    });

    // Delete all user data
    await Workout.deleteMany({ user: userId });
    await Nutrition.deleteMany({ user: userId });
    await Progress.deleteMany({ user: userId });
    await User.findByIdAndDelete(userId);

    // Clear cookie
    res.cookie('refreshToken', '', getRefreshTokenCookieOptions({
      expires: new Date(0),
    }));

    console.log('✅ User account deleted:', userId);
    res.status(200).json({ 
      success: true, 
      message: 'Account permanently deleted' 
    });
    
  } catch (error) {
    console.error('❌ Delete account error:', error);
    next(error);
  }
};

// @desc    Check Cloudinary status
// @route   GET /api/users/cloudinary-status
// @access  Private
const checkCloudinaryStatus = async (req, res, next) => {
  try {
    // Re-check configuration
    const configured = configureCloudinary();
    isCloudinaryConfigured = configured;
    
    const status = {
      configured: isCloudinaryConfigured,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Missing',
      apiKey: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Missing',
      apiSecret: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Missing',
      message: isCloudinaryConfigured 
        ? 'Cloudinary is ready for image uploads' 
        : 'Cloudinary is not configured. Please check server configuration.'
    };
    
    // Test Cloudinary connection if configured
    if (isCloudinaryConfigured && cloudinary) {
      try {
        const pingResult = await cloudinary.api.ping();
        status.testConnection = 'Success';
        status.pingResult = pingResult;
        console.log('✅ Cloudinary ping successful');
      } catch (pingError) {
        status.testConnection = 'Failed';
        status.pingError = pingError.message;
        console.error('❌ Cloudinary ping failed:', pingError.message);
        isCloudinaryConfigured = false;
        status.configured = false;
        status.message = 'Cloudinary connection failed: ' + pingError.message;
      }
    }
    
    res.json(status);
  } catch (error) {
    console.error('Status check error:', error);
    next(error);
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
  checkCloudinaryStatus
};