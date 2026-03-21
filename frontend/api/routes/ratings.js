const express = require('express');
const router = express.Router();
const Rating = require('../models/Rating');
const Event = require('../models/Event');
const { protect } = require('../middleware/auth');

// POST /api/ratings/:eventId - upsert rating
router.post('/:eventId', protect, async (req, res) => {
  try {
    const { stars } = req.body;
    if (!stars || stars < 1 || stars > 5) return res.status(400).json({ message: 'Stars must be 1-5' });
    
    await Rating.findOneAndUpdate(
      { event: req.params.eventId, user: req.user._id },
      { stars },
      { upsert: true, new: true }
    );

    // Recalculate average
    const ratings = await Rating.find({ event: req.params.eventId });
    const avg = ratings.reduce((s, r) => s + r.stars, 0) / ratings.length;
    await Event.findByIdAndUpdate(req.params.eventId, {
      averageRating: Math.round(avg * 10) / 10,
      totalRatings: ratings.length
    });

    res.json({ average: Math.round(avg * 10) / 10, total: ratings.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/ratings/:eventId
router.get('/:eventId', async (req, res) => {
  try {
    const ratings = await Rating.find({ event: req.params.eventId });
    const avg = ratings.length ? ratings.reduce((s, r) => s + r.stars, 0) / ratings.length : 0;
    res.json({ average: Math.round(avg * 10) / 10, total: ratings.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/ratings/:eventId/mine
router.get('/:eventId/mine', protect, async (req, res) => {
  try {
    const rating = await Rating.findOne({ event: req.params.eventId, user: req.user._id });
    res.json({ stars: rating ? rating.stars : 0 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
