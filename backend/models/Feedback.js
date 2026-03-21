const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  type:    { type: String, enum: ['bug', 'suggestion'], required: true },
  message: { type: String, required: true, maxlength: 2000 },
  email:   { type: String },
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status:  { type: String, enum: ['new', 'seen', 'resolved'], default: 'new' },
}, { timestamps: true });

module.exports = mongoose.model('Feedback', FeedbackSchema);
