const User = require('../../models/User');
const { logEvent } = require('../../services/logService');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'admin') {
        return res.status(400).json({ success: false, message: 'Cannot delete an admin user' });
    }

    await user.deleteOne();
    res.status(200).json({ success: true, message: 'User removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
const updateUserRole = async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
  
      user.role = req.body.role || user.role;
      await user.save();
  
      res.status(200).json({ success: true, data: user });

      // Log role update
      await logEvent({
        event: 'USER_ROLE_UPDATE',
        message: `User ${user.email} role updated to ${user.role}`,
        category: 'SECURITY',
        severity: 'WARNING',
        user: req.user._id
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

// @desc    Update user details
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.name = name || user.name;
    user.email = email || user.email;
    
    await user.save();

    res.status(200).json({ success: true, data: user });

    // Log update
    await logEvent({
        event: 'USER_DETAILS_UPDATE',
        message: `Admin updated details for user: ${user.email}`,
        category: 'SYSTEM',
        user: req.user._id
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllUsers,
  deleteUser,
  updateUserRole,
  updateUser
};
