const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { generateOTP, sendOTPEmail } = require('../utils/emailService');
const admin = require('firebase-admin');

// ── Initialize Firebase Admin (lazy, once) ─────────────────────────────────
if (!admin.apps.length) {
  const projectId    = process.env.FIREBASE_PROJECT_ID;
  const clientEmail  = process.env.FIREBASE_CLIENT_EMAIL;
  // Render stores the private key as a single-line string with literal \n — fix that
  const privateKey   = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
    console.log('✅ Firebase Admin SDK initialized');
  } else {
    console.warn('⚠️  Firebase Admin SDK not initialized — missing FIREBASE_* env vars');
  }
}

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// ──────────────────────────────────────────────
// GOOGLE SIGN-IN
// ──────────────────────────────────────────────
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: 'idToken is required' });

    if (!admin.apps.length) {
      return res.status(503).json({ message: 'Google auth not configured on server yet' });
    }

    // Verify the Firebase ID token
    const decoded = await admin.auth().verifyIdToken(idToken);
    const { name, email, picture, uid } = decoded;

    if (!email) return res.status(400).json({ message: 'No email in Google account' });

    // Find or create the user
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // New user — create account (no password needed for Google users)
      user = await User.create({
        name: name || email.split('@')[0],
        email: email.toLowerCase(),
        password: uid,           // Firebase UID used as placeholder (bcrypt hashed by pre-save hook)
        avatar: picture || '',
        googleId: uid,
        approved: true,          // Google accounts auto-approved
      });
      console.log(`✅ New Google user created: ${email}`);
    } else {
      // Update avatar if they now have one
      if (picture && !user.avatar) {
        user.avatar = picture;
        await user.save();
      }
      if (!user.googleId) {
        user.googleId = uid;
        await user.save();
      }
    }

    const token = generateToken(user._id);
    res.json({
      message: 'Logged in with Google!',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (err) {
    console.error('Google auth error:', err.message);
    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: 'Google session expired. Please sign in again.' });
    }
    res.status(500).json({ message: 'Google authentication failed' });
  }
});

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

    await OTP.deleteMany({ email: email.toLowerCase(), purpose: 'verify' });

    const otp = generateOTP();

    await OTP.create({
      email: email.toLowerCase(),
      otp,
      purpose: 'verify',
      userData: { name, password },
    });

    // LOG OTP TO CONSOLE (Admin can see this in Render logs for manual verification)
    console.log(`\n🔑 REGISTRATION OTP for ${email}: ${otp}\n`);

    // Try to send email.
    let emailSent = false;
    try {
      await sendOTPEmail(email, otp, 'verify');
      emailSent = true;
    } catch (emailErr) {
      console.warn(`⚠️  Resend Sandbox: Could not email OTP to ${email}, but it is logged above. 🔑`);
    }

    res.json({
      message: emailSent
        ? 'OTP sent to your email!'
        : `OTP generated! (Resend Sandbox: check Render logs for the code)`,
    });
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

router.post('/forgot-password/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.json({ message: 'If this email is registered, an OTP has been sent.' });

    await OTP.deleteMany({ email: email.toLowerCase(), purpose: 'reset' });

    const otp = generateOTP();
    await OTP.create({ email: email.toLowerCase(), otp, purpose: 'reset' });

    // LOG OTP TO CONSOLE
    console.log(`\n🔑 PASSWORD RESET OTP for ${email}: ${otp}\n`);

    let emailSent = false;
    try {
      await sendOTPEmail(email, otp, 'reset');
      emailSent = true;
    } catch (err) {
      console.warn(`⚠️  Resend Sandbox: Could not email reset OTP to ${email}, but it is logged above. 🔑`);
    }

    res.json({
      message: emailSent
        ? 'OTP sent to your email!'
        : 'OTP generated! (Resend Sandbox: check Render logs for the code)',
    });
  } catch (err) {
    console.error('Forgot OTP error:', err);
    res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
  }
});

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
