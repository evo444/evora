const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendOTPEmail = async (to, otp, purpose = 'verify') => {
  const isReset = purpose === 'reset';
  const subject = isReset ? '🔑 Evora Password Reset OTP' : '✅ Verify Your Evora Account';
  const heading = isReset ? 'Reset Your Password' : 'Verify Your Email';
  const message = isReset
    ? 'You requested a password reset. Use the OTP below to set a new password.'
    : 'Welcome to Evora! Use the OTP below to verify your email and complete registration.';

  const html = `
  <!DOCTYPE html>
  <html>
  <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
      <tr><td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#16a34a,#15803d);padding:36px;text-align:center;">
              <div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:16px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
                <span style="font-size:28px;line-height:56px;">🌴</span>
              </div>
              <h1 style="color:#ffffff;margin:8px 0 4px;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Evora</h1>
              <p style="color:rgba(255,255,255,0.8);margin:0;font-size:13px;">Kerala Events Hub</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px;">
              <h2 style="color:#111827;font-size:20px;font-weight:700;margin:0 0 8px;">${heading}</h2>
              <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 28px;">${message}</p>

              <!-- OTP Box -->
              <div style="background:#f0fdf4;border:2px dashed #86efac;border-radius:16px;padding:24px;text-align:center;margin-bottom:28px;">
                <p style="color:#15803d;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Your OTP Code</p>
                <div style="font-size:42px;font-weight:900;letter-spacing:10px;color:#16a34a;font-family:'Courier New',monospace;">${otp}</div>
                <p style="color:#86efac;font-size:11px;margin:8px 0 0;">⏰ Valid for 10 minutes only</p>
              </div>

              <div style="background:#fef3c7;border-radius:10px;padding:12px 16px;margin-bottom:24px;">
                <p style="color:#92400e;font-size:12px;margin:0;">⚠️ <strong>Never share this OTP</strong> with anyone. Evora will never ask for it.</p>
              </div>

              <p style="color:#9ca3af;font-size:12px;margin:0;">If you didn't request this, you can safely ignore this email.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #f3f4f6;">
              <p style="color:#9ca3af;font-size:11px;margin:0;">© 2025 Evora · Kerala Events Hub · evora444@gmail.com</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
  </html>`;

  try {
    await transporter.sendMail({
      from: `"Evora 🌴" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('❌ Nodemailer Error:', error.message);
    if (error.code === 'EAUTH') {
      console.error('ℹ️ Hint: Check your GMAIL_USER and GMAIL_PASS (App Password).');
    }
    throw error; // Re-throw for auth.js to catch
  }
};

module.exports = { generateOTP, sendOTPEmail };
