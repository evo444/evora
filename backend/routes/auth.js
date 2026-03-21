const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { generateOTP, sendOTPEmail } = require('../utils/emailService');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// ──────────────────────────────────────────────
// REGISTRATION FLOW (2 steps)
// ──────────────────────────────────────────────

// Step 1: Send OTP to email
router.post('/register/send-otp', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'All fields required' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    // Delete any old OTPs for this email
    await OTP.deleteMany({ email: email.toLowerCase(), purpose: 'verify' });

    const otp = generateOTP();

    await OTP.create({
      email: email.toLowerCase(),
      otp,
      purpose: 'verify',
      userData: { name, password }, // Store PLAIN password temporarily, User.create will hash it
    });

    await sendOTPEmail(email, otp, 'verify');
    res.json({ message: 'OTP sent to your email!' });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
  }
});

// Step 2: Verify OTP and create account
router.post('/register/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const record = await OTP.findOne({ email: email.toLowerCase(), purpose: 'verify', otp });
    if (!record) return res.status(400).json({ message: 'Invalid or expired OTP' });

    // Create the user (pre-save hook in User.js will hash the password)
    const user = await User.create({
      name: record.userData.name,
      email: email.toLowerCase(),
      password: record.userData.password,
      approved: true,
    });

    await OTP.deleteMany({ email: email.toLowerCase(), purpose: 'verify' });

    const token = generateToken(user._id);
    res.status(201).json({
      message: 'Email verified! Account created.',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ──────────────────────────────────────────────
// LOGIN
// ──────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    res.json({
      token: generateToken(user._id),
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ──────────────────────────────────────────────
// FORGOT PASSWORD FLOW (2 steps)
// ──────────────────────────────────────────────

// Step 1: Send reset OTP
router.post('/forgot-password/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    // Always respond positively to prevent email enumeration
    if (!user) return res.json({ message: 'If this email is registered, an OTP has been sent.' });

    await OTP.deleteMany({ email: email.toLowerCase(), purpose: 'reset' });

    const otp = generateOTP();
    await OTP.create({ email: email.toLowerCase(), otp, purpose: 'reset' });
    await sendOTPEmail(email, otp, 'reset');

    res.json({ message: 'OTP sent to your email!' });
  } catch (err) {
    console.error('Forgot OTP error:', err);
    res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
  }
});

// Step 2: Verify reset OTP + new password
router.post('/forgot-password/reset', async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const record = await OTP.findOne({ email: email.toLowerCase(), purpose: 'reset', otp });
    if (!record) return res.status(400).json({ message: 'Invalid or expired OTP' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.password = password;
    await user.save();

    await OTP.deleteMany({ email: email.toLowerCase(), purpose: 'reset' });

    const token = generateToken(user._id);
    res.json({
      message: 'Password reset successful!',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/auth/me
router.get('/me', require('../middleware/auth').protect, async (req, res) => {
  res.json(req.user);
});

module.exports = router;
