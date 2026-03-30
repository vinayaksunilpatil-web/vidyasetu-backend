const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Send OTP email to user
 */
async function sendOTPEmail(toEmail, otp, userName) {
  const mailOptions = {
    from: `"VidyaSetu Platform" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: '🎓 VidyaSetu OTP Verification',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7f6; margin: 0; padding: 20px; }
          .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #1a6b3c, #2d9e6b); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; letter-spacing: 2px; }
          .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px; }
          .body { padding: 35px 30px; }
          .greeting { color: #333; font-size: 16px; margin-bottom: 20px; }
          .otp-box { background: linear-gradient(135deg, #f0faf5, #e8f5ee); border: 2px dashed #2d9e6b; border-radius: 12px; padding: 25px; text-align: center; margin: 25px 0; }
          .otp-label { color: #666; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
          .otp-code { font-size: 42px; font-weight: 800; color: #1a6b3c; letter-spacing: 10px; font-family: 'Courier New', monospace; }
          .validity { color: #e74c3c; font-size: 13px; margin-top: 10px; font-weight: 600; }
          .info { color: #666; font-size: 14px; line-height: 1.6; }
          .footer { background: #f8fdf9; padding: 20px 30px; text-align: center; border-top: 1px solid #e8f0eb; }
          .footer p { color: #999; font-size: 12px; margin: 0; }
          .badge { display: inline-block; background: #e8f5ee; color: #1a6b3c; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 VIDYASETU</h1>
            <p>Smart Education Donation Platform</p>
          </div>
          <div class="body">
            <span class="badge">🔐 OTP Verification</span>
            <p class="greeting">Hello <strong>${userName || 'User'}</strong>,</p>
            <p class="info">You requested to log in to your VidyaSetu account. Use the OTP below to complete your verification:</p>
            <div class="otp-box">
              <div class="otp-label">Your One-Time Password</div>
              <div class="otp-code">${otp}</div>
              <div class="validity">⏰ Valid for 3 minutes only</div>
            </div>
            <p class="info">
              If you didn't request this OTP, please ignore this email. Your account remains secure.<br><br>
              Never share this OTP with anyone, including VidyaSetu staff.
            </p>
          </div>
          <div class="footer">
            <p>© 2024 VidyaSetu · Empowering Education Through Technology</p>
            <p style="margin-top: 6px;">This is an automated message. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  return transporter.sendMail(mailOptions);
}

/**
 * Send donation receipt email
 */
async function sendDonationReceipt(toEmail, donorName, amount, category, receiptId) {
  const studentsHelped = Math.floor(amount / 150);
  const mailOptions = {
    from: `"VidyaSetu Platform" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `🎓 Donation Receipt - ₹${amount} | VidyaSetu`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7f6; margin: 0; padding: 20px; }
          .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #1a6b3c, #2d9e6b); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 26px; }
          .header p { color: rgba(255,255,255,0.85); margin: 6px 0 0; }
          .body { padding: 30px; }
          .amount-box { background: linear-gradient(135deg, #f0faf5, #dff2e8); border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
          .amount { font-size: 40px; font-weight: 800; color: #1a6b3c; }
          .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
          .label { color: #999; }
          .value { color: #333; font-weight: 600; }
          .impact { background: #fff3e0; border-left: 4px solid #ff9800; border-radius: 8px; padding: 15px; margin: 20px 0; }
          .footer { background: #f8fdf9; padding: 20px; text-align: center; border-top: 1px solid #e8f0eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 Donation Receipt</h1>
            <p>Thank you for your generosity!</p>
          </div>
          <div class="body">
            <p>Dear <strong>${donorName}</strong>,</p>
            <p>Your donation has been successfully received. Here are your details:</p>
            <div class="amount-box">
              <div style="color:#666;font-size:13px;margin-bottom:5px;">DONATED AMOUNT</div>
              <div class="amount">₹${amount}</div>
            </div>
            <div class="row"><span class="label">Receipt ID</span><span class="value">${receiptId}</span></div>
            <div class="row"><span class="label">Category</span><span class="value">${category}</span></div>
            <div class="row"><span class="label">Date</span><span class="value">${new Date().toLocaleDateString('en-IN')}</span></div>
            <div class="row"><span class="label">Status</span><span class="value" style="color:#2d9e6b;">✅ Completed</span></div>
            <div class="impact">
              <strong>🌟 Your Impact:</strong><br>
              Your ₹${amount} donation to <em>${category}</em> could help approximately <strong>${studentsHelped} student${studentsHelped !== 1 ? 's' : ''}</strong> continue their education!
            </div>
          </div>
          <div class="footer">
            <p>© 2024 VidyaSetu · Empowering Education</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  return transporter.sendMail(mailOptions);
}

async function sendResetEmail(toEmail, userName, resetLink) {
  const mailOptions = {
    from: `"VidyaSetu Platform" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: '🔑 VidyaSetu Password Reset Request',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7f6; margin: 0; padding: 20px; }
          .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #1a6b3c, #2d9e6b); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 26px; }
          .body { padding: 35px 30px; }
          .btn { display: block; background: linear-gradient(135deg, #1a6b3c, #2d9e6b); color: white; text-decoration: none; padding: 14px 28px; border-radius: 10px; text-align: center; font-weight: 700; font-size: 16px; margin: 24px 0; }
          .warning { background: #fff3e0; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; font-size: 13px; color: #92400e; margin-top: 16px; }
          .footer { background: #f8fdf9; padding: 20px; text-align: center; border-top: 1px solid #e8f0eb; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 VidyaSetu</h1>
            <p style="color:rgba(255,255,255,0.8); margin:6px 0 0;">Password Reset Request</p>
          </div>
          <div class="body">
            <p>Hello <strong>${userName}</strong>,</p>
            <p>We received a request to reset your VidyaSetu password. Click the button below to set a new password:</p>
            <a href="${resetLink}" class="btn">🔑 Reset My Password</a>
            <div class="warning">
              ⏰ This link expires in <strong>15 minutes</strong>.<br>
              If you didn't request this, ignore this email — your account is safe.
            </div>
          </div>
          <div class="footer">
            <p>© 2026 VidyaSetu · Empowering Education</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
  return transporter.sendMail(mailOptions);
}

module.exports = { sendOTPEmail, sendDonationReceipt, sendResetEmail };