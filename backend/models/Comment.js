const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true },
  edited: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Comment', CommentSchema);
