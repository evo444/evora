const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Event = require('../models/Event');
const { protect, adminOnly } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// GET /api/events — public, only approved events
router.get('/', async (req, res) => {
  try {
    const { search, category, crowd, minRating, date, trending, recentWeek, page = 1, limit = 12 } = req.query;
    let query = { status: 'approved' };
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { 'location.address': { $regex: search, $options: 'i' } },
      { 'location.district': { $regex: search, $options: 'i' } }
    ];
    if (category) query.category = category;
    if (crowd) query.crowd = crowd;
    if (minRating) query.averageRating = { $gte: parseFloat(minRating) };
    if (date) {
      const d = new Date(date);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      query.date = { $gte: d, $lt: next };
    }
    if (trending === 'true') query.trending = true;
    if (recentWeek === 'true') {
      const now = new Date();
      const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
      query.createdAt = { $gte: weekAgo, $lte: now };
    }

    const total = await Event.countDocuments(query);
    const sortOrder = recentWeek === 'true' ? { createdAt: -1 } : { date: 1 };
    const events = await Event.find(query)
      .populate('createdBy', 'name role')
      .populate('submittedBy', 'name')
      .sort(sortOrder)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ events, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/events/submissions — admin sees pending/rejected submissions
router.get('/submissions', protect, adminOnly, async (req, res) => {
  try {
    const events = await Event.find({ status: { $in: ['pending', 'rejected'] } })
      .populate('submittedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/events/submissions/:id/approve
router.put('/submissions/:id/approve', protect, adminOnly, async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', rejectionReason: null },
      { new: true }
    );
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/events/submissions/:id/reject
router.put('/submissions/:id/reject', protect, adminOnly, async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', rejectionReason: req.body.reason || 'Not approved' },
      { new: true }
    );
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/events/submissions/:id — admin permanently removes a submission
router.delete('/submissions/:id', protect, adminOnly, async (req, res) => {
  try {
    const event = await Event.findOneAndDelete({
      _id: req.params.id,
      status: { $in: ['pending', 'rejected'] }
    });
    if (!event) return res.status(404).json({ message: 'Submission not found' });
    res.json({ message: 'Submission deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// GET /api/events/:id — public single event
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('submittedBy', 'name');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/events/submit — logged-in user submits event for approval
router.post('/submit', protect, upload.array('images', 5), async (req, res) => {
  try {
    const images = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];
    const locationData = typeof req.body.location === 'string' ? JSON.parse(req.body.location) : req.body.location;
    const event = await Event.create({
      ...req.body,
      location: locationData,
      images,
      submittedBy: req.user._id,
      status: 'pending',
    });
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/events — admin creates directly (approved)
router.post('/', protect, adminOnly, upload.array('images', 10), async (req, res) => {
  try {
    const images = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];
    const locationData = typeof req.body.location === 'string' ? JSON.parse(req.body.location) : req.body.location;
    const event = await Event.create({ ...req.body, location: locationData, images, createdBy: req.user._id, status: 'approved' });
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/events/:id (admin)
router.put('/:id', protect, adminOnly, upload.array('images', 10), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    const newImages = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];
    const locationData = req.body.location
      ? (typeof req.body.location === 'string' ? JSON.parse(req.body.location) : req.body.location)
      : event.location;
    const updated = await Event.findByIdAndUpdate(req.params.id, {
      ...req.body, location: locationData,
      images: newImages.length > 0 ? [...event.images, ...newImages] : event.images
    }, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/events/:id (admin)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
