const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  shortDescription: { type: String },
  date: { type: Date, required: true },
  endDate: { type: Date },
  location: {
    address: { type: String, required: true },
    district: { type: String },
    lat:  { type: Number },   // exact latitude from map pin — NO default so missing coords are visible
    lng:  { type: Number },   // exact longitude from map pin — NO default
    placeName: { type: String },
  },
  category: {
    type: String,
    enum: ['Festival', 'Tech', 'Music', 'Cultural', 'Sports', 'Food', 'Art', 'Education', 'Other'],
    required: true
  },
  images: [{ type: String }],
  crowd: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  attendees: { type: Number, default: 0 },
  trending: { type: Boolean, default: false },
  organizerName:  { type: String },
  organizerPhone: { type: String },
  organizerEmail: { type: String },
  website:        { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  rejectionReason: { type: String },
  averageRating: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 },
  tags: [{ type: String }],
  // Who added this event: 'user' (self-submitted), 'admin' (manually added), 'AI' (weekly scheduler)
  addedBy: { type: String, enum: ['user', 'admin', 'AI'], default: 'user' },
}, { timestamps: true });

// ── Indexes for production query performance ──────────────────────────
// Primary listing query: approved events sorted by date
EventSchema.index({ status: 1, date: -1 });
// Category filter
EventSchema.index({ status: 1, category: 1, date: -1 });
// District filter
EventSchema.index({ status: 1, 'location.district': 1, date: -1 });
// Trending events
EventSchema.index({ status: 1, trending: 1, date: -1 });
// Full-text search on name, description, address
EventSchema.index({ name: 'text', description: 'text', 'location.address': 'text' });
// Admin dashboard: submissions by status
EventSchema.index({ status: 1, createdAt: -1 });
// AI queue: pending events added by AI
EventSchema.index({ addedBy: 1, status: 1, date: 1 });

module.exports = mongoose.model('Event', EventSchema);
