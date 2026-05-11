const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { generateOTP, sendOTPEmail } = require('../utils/emailService');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// ── ADMIN EMAILS — automatically get admin role on Google sign-in ──────────
const ADMIN_EMAILS = ['evora444@gmail.com', 'nibi2810@gmail.com'];


// ── Verify Firebase ID token using Google's public keys (no Admin SDK needed) ─
async function verifyFirebaseIdToken(idToken) {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'zz0n-22d1c';

  // Fetch Google's public keys
  const keyRes = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
  const keys = await keyRes.json();

  // Decode header to get key ID
  const headerB64 = idToken.split('.')[0];
  const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());
  const publicKey = keys[header.kid];
  if (!publicKey) throw new Error('Unknown key ID in Firebase token');

  // Verify token
  const decoded = jwt.verify(idToken, publicKey, {
    algorithms: ['RS256'],
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`,
  });
  return decoded;
}

// ──────────────────────────────────────────────
// GOOGLE SIGN-IN
// ──────────────────────────────────────────────
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: 'idToken is required' });

    // Verify the Firebase ID token (works with any Firebase project)
    let decoded;
    try {
      decoded = await verifyFirebaseIdToken(idToken);
    } catch (verifyErr) {
      console.error('Token verify error:', verifyErr.message);
      return res.status(401).json({ message: 'Invalid or expired Google token. Please try again.' });
    }

    const { name, email, picture, sub: uid } = decoded;
    if (!email) return res.status(400).json({ message: 'No email in Google account' });

    // Find or create the user
    let user = await User.findOne({ email: email.toLowerCase() });
    const isAdminEmail = ADMIN_EMAILS.includes(email.toLowerCase());

    if (!user) {
      user = await User.create({
        name: name || email.split('@')[0],
        email: email.toLowerCase(),
        password: uid,
        avatar: picture || '',
        googleId: uid,
        approved: true,
        role: isAdminEmail ? 'admin' : 'user',
      });
      console.log(`✅ New Google user created: ${email} (role: ${user.role})`);
    } else {
      // Update fields
      let changed = false;
      if (picture && !user.avatar) { user.avatar = picture; changed = true; }
      if (!user.googleId) { user.googleId = uid; changed = true; }
      if (isAdminEmail && user.role !== 'admin') { user.role = 'admin'; changed = true; }
      if (changed) await user.save();
    }

    const token = generateToken(user._id);
    res.json({
      message: 'Logged in with Google!',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(500).json({ message: 'Google authentication failed: ' + err.message });
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
