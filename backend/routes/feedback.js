const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const { protect, adminOnly } = require('../middleware/auth');

// POST /api/feedback — anyone can submit
router.post('/', async (req, res) => {
  try {
    const { type, message, email } = req.body;
    if (!type || !message) return res.status(400).json({ message: 'Type and message are required' });
    const fb = await Feedback.create({
      type, message, email,
      user: req.headers.authorization ? req.user?._id : undefined,
    });
    res.status(201).json({ message: 'Thank you for your feedback!', id: fb._id });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/feedback — admin only
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { type, status } = req.query;
    let q = {};
    if (type) q.type = type;
    if (status) q.status = status;
    const items = await Feedback.find(q).populate('user', 'name email').sort({ createdAt: -1 });
    res.json(items);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH /api/feedback/:id — admin mark status
router.patch('/:id', protect, adminOnly, async (req, res) => {
  try {
    const fb = await Feedback.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json(fb);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/feedback/:id — admin only
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Feedback.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
