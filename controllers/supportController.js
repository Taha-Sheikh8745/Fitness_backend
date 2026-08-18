const Support = require('../models/Support');
const { createNotification } = require('../utils/notificationHelper');

const createTicket = async (req, res) => {
  try {
    const { subject, message } = req.body;
    const support = await Support.create({
      user: req.user._id, subject, message
    });
    
    await createNotification(
      req.user._id,
      `Your support ticket has been received: ${subject}`,
      'Support'
    );
    
    res.status(201).json({ success: true, data: support });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { createTicket };
