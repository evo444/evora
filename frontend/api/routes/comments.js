const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const { protect } = require('../middleware/auth');

// GET comments for an event
router.get('/:eventId', async (req, res) => {
  try {
    const comments = await Comment.find({ event: req.params.eventId })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST comment
router.post('/:eventId', protect, async (req, res) => {
  try {
    if (!req.body.text) return res.status(400).json({ message: 'Comment text required' });
    const comment = await Comment.create({ event: req.params.eventId, user: req.user._id, text: req.body.text });
    const populated = await comment.populate('user', 'name avatar');
    
    // Emit via socket if available
    if (req.app.get('io')) {
      req.app.get('io').to(req.params.eventId).emit('new_comment', populated);
    }
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT comment (edit own)
router.put('/:id', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (comment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    comment.text = req.body.text;
    comment.edited = true;
    await comment.save();
    const populated = await comment.populate('user', 'name avatar');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE comment
router.delete('/:id', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (comment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await comment.deleteOne();
    if (req.app.get('io')) {
      req.app.get('io').to(comment.event.toString()).emit('delete_comment', { id: req.params.id });
    }
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
