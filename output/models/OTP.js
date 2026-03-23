const mongoose = require('mongoose');

const OTPSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true },
  otp: { type: String, required: true },
  purpose: { type: String, enum: ['verify', 'reset'], default: 'verify' },
  // store registration data temporarily until OTP is verified
  userData: {
    name: String,
    password: String, // will be hashed when account is created
  },
  createdAt: { type: Date, default: Date.now, expires: 600 } // auto-delete after 10 min
});

module.exports = mongoose.model('OTP', OTPSchema);
