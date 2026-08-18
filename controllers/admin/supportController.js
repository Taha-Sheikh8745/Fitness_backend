const Support = require('../../models/Support');

// @desc    Get all support tickets
// @route   GET /api/admin/support
// @access  Private/Admin
const getAllTickets = async (req, res) => {
  try {
    const tickets = await Support.find({})
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: tickets.length, data: tickets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update ticket status
// @route   PUT /api/admin/support/:id
// @access  Private/Admin
const updateTicketStatus = async (req, res) => {
  try {
    const ticket = await Support.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    ticket.status = req.body.status || ticket.status;
    await ticket.save();

    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllTickets,
  updateTicketStatus
};
