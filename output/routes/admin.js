const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Event = require('../models/Event');
const Feedback = require('../models/Feedback');
const { protect, adminOnly } = require('../middleware/auth');

// GET all users
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT approve user
router.put('/users/:id/approve', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { approved: true }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT reject/unapprove user
router.put('/users/:id/reject', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { approved: false }, { new: true }).select('-password');
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE user
router.delete('/users/:id', protect, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET analytics
router.get('/analytics', protect, adminOnly, async (req, res) => {
  try {
    const topEvents = await Event.find().sort({ averageRating: -1, attendees: -1 }).limit(5);
    const totalEvents = await Event.countDocuments();
    const totalUsers = await User.countDocuments();
    const pendingUsers = await User.countDocuments({ approved: false });
    const byCategory = await Event.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    res.json({ topEvents, totalEvents, totalUsers, pendingUsers, byCategory });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT toggle trending
router.put('/events/:id/trending', protect, adminOnly, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    event.trending = !event.trending;
    await event.save();
    res.json(event);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/admin/dbstats — live database stats for Database tab
router.get('/dbstats', protect, adminOnly, async (req, res) => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    const totalUsers = await User.countDocuments();
    const [
      totalEvents, approvedEvents, pendingEvents, rejectedEvents,
      totalFeedback, bugReports, suggestions, newFeedback,
      recentUsers, recentEvents, recentFeedback
    ] = await Promise.all([
      Event.countDocuments(),
      Event.countDocuments({ status: 'approved' }),
      Event.countDocuments({ status: 'pending' }),
      Event.countDocuments({ status: 'rejected' }),
      Feedback.countDocuments(),
      Feedback.countDocuments({ type: 'bug' }),
      Feedback.countDocuments({ type: 'suggestion' }),
      Feedback.countDocuments({ status: 'new' }),
      User.find().select('name email role createdAt').sort({ createdAt: -1 }).limit(5),
      Event.find().select('name category status date createdAt').sort({ createdAt: -1 }).limit(5),
      Feedback.find().select('type message status createdAt').populate('user', 'name').sort({ createdAt: -1 }).limit(5),
    ]);

    res.json({
      collections: [
        {
          name: 'Users', icon: '👥', color: 'blue',
          total: totalUsers,
          stats: [
            { label: 'Admins', value: adminCount },
            { label: 'Regular Users', value: totalUsers - adminCount },
          ],
          recent: recentUsers,
        },
        {
          name: 'Events', icon: '🎪', color: 'green',
          total: totalEvents,
          stats: [
            { label: 'Approved', value: approvedEvents },
            { label: 'Pending', value: pendingEvents },
            { label: 'Rejected', value: rejectedEvents },
          ],
          recent: recentEvents,
        },
        {
          name: 'Feedback', icon: '💬', color: 'orange',
          total: totalFeedback,
          stats: [
            { label: 'Bug Reports', value: bugReports },
            { label: 'Suggestions', value: suggestions },
            { label: 'Unread', value: newFeedback },
          ],
          recent: recentFeedback,
        },
      ]
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
