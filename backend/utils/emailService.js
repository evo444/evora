/**
 * emailService.js — Resend API (HTTP-based, works on Render free tier)
 *
 * Why Resend instead of Gmail SMTP?
 * Render's free tier blocks outbound SMTP ports (465, 587).
 * Resend uses HTTPS (port 443) which is always open.
 *
 * Setup (2 min):
 *   1. Go to https://resend.com → sign up free
 *   2. API Keys → Create Key → copy it
 *   3. Add RESEND_API_KEY to Render → Environment Variables
 */

const { Resend } = require('resend');

let _resend = null;

function getResend() {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('Missing RESEND_API_KEY. Add it to .env and Render Environment Variables.');
  _resend = new Resend(key);
  return _resend;
}

async function verifyEmailTransport() {
  try {
    getResend(); // will throw if key missing
    console.log('✅ Email: Resend API ready');
  } catch (err) {
    console.warn('⚠️  Email:', err.message);
  }
}

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendOTPEmail = async (to, otp, purpose = 'verify') => {
  const isReset = purpose === 'reset';
  const subject = isReset ? 'Reset your Evora password' : 'Your Evora verification code';
  const heading = isReset ? 'Reset Your Password' : 'Verify Your Email';
  const message = isReset
    ? 'You requested a password reset. Use the OTP below to set a new password.'
    : 'Welcome to Evora! Use the OTP below to verify your email and complete registration.';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0"
        style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#111827,#1f2937);padding:36px;text-align:center;">
            <div style="width:48px;height:48px;background:rgba(255,255,255,0.15);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:10px;">
              <span style="font-size:24px;font-weight:900;color:#fff;font-family:Arial Black,sans-serif;line-height:48px;">E</span>
            </div>
            <h1 style="color:#fff;margin:6px 0 2px;font-size:22px;font-weight:800;">Evora</h1>
            <p style="color:rgba(255,255,255,0.55);margin:0;font-size:12px;">Kerala Events Hub</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="color:#111827;font-size:19px;font-weight:700;margin:0 0 6px;">${heading}</h2>
            <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px;">${message}</p>
            <div style="background:#f9fafb;border:2px solid #e5e7eb;border-radius:14px;padding:22px;text-align:center;margin-bottom:24px;">
              <p style="color:#374151;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 8px;">Verification Code</p>
              <div style="font-size:40px;font-weight:900;letter-spacing:12px;color:#111827;font-family:'Courier New',monospace;">${otp}</div>
              <p style="color:#9ca3af;font-size:11px;margin:8px 0 0;">⏰ Expires in 10 minutes</p>
            </div>
            <div style="background:#fef9c3;border-radius:10px;padding:10px 14px;margin-bottom:20px;">
              <p style="color:#854d0e;font-size:12px;margin:0;">⚠️ <strong>Never share this code.</strong> Evora will never ask for it.</p>
            </div>
            <p style="color:#9ca3af;font-size:12px;margin:0;">If you didn't request this, ignore this email.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:16px;text-align:center;border-top:1px solid #f3f4f6;">
            <p style="color:#9ca3af;font-size:11px;margin:0;">© 2025 Evora · Kerala Events Hub</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: 'Evora Kerala Events <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error(`❌ Resend error to ${to}:`, error);
      throw new Error(error.message || 'Resend API error');
    }

    console.log(`📧 OTP sent via Resend to ${to} [${purpose}] — id: ${data?.id}`);
    return data;
  } catch (err) {
    console.error(`❌ Email failed to ${to}:`, err.message);
    if (err.message?.includes('RESEND_API_KEY')) {
      console.error('   → Get a free key at https://resend.com and add RESEND_API_KEY to Render.');
    }
    throw err;
  }
};

module.exports = { generateOTP, sendOTPEmail, verifyEmailTransport };
