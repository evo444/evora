const mongoose = require('mongoose');

const RatingSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  stars: { type: Number, min: 1, max: 5, required: true }
}, { timestamps: true });

RatingSchema.index({ event: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Rating', RatingSchema);
