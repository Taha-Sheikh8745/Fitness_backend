const User = require('../models/User');

// @desc    Check if user has required subscription level
// @access  Private
const checkSubscription = (requiredPlan = 'PRO') => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id);
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const subscription = user.subscription || { plan: 'FREE' };
      const userPlan = subscription.plan;

      // Define plan hierarchy
      const planHierarchy = {
        'FREE': 0,
        'PRO': 1,
        'ELITE': 2
      };

      const requiredLevel = planHierarchy[requiredPlan] || 1;
      const userLevel = planHierarchy[userPlan] || 0;

      if (userLevel < requiredLevel) {
        return res.status(403).json({ 
          success: false, 
          message: `This feature requires ${requiredPlan} subscription or higher`,
          requiredPlan,
          currentPlan: userPlan
        });
      }

      next();
    } catch (error) {
      console.error('Subscription check error:', error);
      res.status(500).json({ success: false, message: 'Error checking subscription' });
    }
  };
};

module.exports = { checkSubscription };
