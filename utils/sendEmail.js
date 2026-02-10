import transporter from '../config/email.js';

/**
 * Generate 6-digit OTP
 * @returns {String} OTP code
 */
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP email
 * @param {String} email - Recipient email
 * @param {String} name - Recipient name
 * @param {String} otp - OTP code
 */
export const sendOTPEmail = async (email, name, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Campus Core - Email Verification OTP',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; border: 2px dashed #10b981; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 32px; font-weight: bold; color: #10b981; letter-spacing: 5px; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 Campus Core</h1>
            <p>Student Support Platform</p>
          </div>
          <div class="content">
            <h2>Hello ${name}!</h2>
            <p>Thank you for registering with Campus Core. Please use the following OTP to verify your email address:</p>
            
            <div class="otp-box">
              <p style="margin: 0; color: #666;">Your Verification Code</p>
              <div class="otp-code">${otp}</div>
              <p style="margin: 0; color: #666; font-size: 14px;">Valid for 10 minutes</p>
            </div>
            
            <p><strong>Important:</strong> This OTP will expire in 10 minutes. If you didn't request this, please ignore this email.</p>
            
            <p>Welcome to Campus Core! 🎉</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
            <p>&copy; 2026 Campus Core. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${email}`);
  } catch (error) {
    console.error(`❌ Error sending OTP email:`, error);
    throw new Error('Failed to send OTP email');
  }
};

/**
 * Send welcome email after verification
 * @param {String} email - Recipient email
 * @param {String} name - Recipient name
 * @param {String} role - User role
 */
export const sendWelcomeEmail = async (email, name, role) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Welcome to Campus Core!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .features { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .feature-item { margin: 10px 0; padding: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 Welcome to Campus Core!</h1>
          </div>
          <div class="content">
            <h2>Hello ${name}! 👋</h2>
            <p>Your account has been successfully verified. You're all set to explore Campus Core!</p>
            
            <div class="features">
              <h3>What you can do:</h3>
              <div class="feature-item">📅 <strong>Events & Calendar</strong> - Stay updated with campus events</div>
              <div class="feature-item">🆘 <strong>SOS System</strong> - Emergency assistance at your fingertips</div>
              <div class="feature-item">💬 <strong>Counseling</strong> - Anonymous and secure counseling support</div>
              <div class="feature-item">📚 <strong>Study Pods</strong> - Collaborative learning spaces</div>
              <div class="feature-item">🚨 <strong>Emergency Assist</strong> - Help for newcomers</div>
            </div>
            
            <p>Login now and explore all features!</p>
            <p style="text-align: center; margin: 20px 0;">
              <a href="${process.env.FRONTEND_URL}" style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Go to Campus Core</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${email}`);
  } catch (error) {
    console.error(`❌ Error sending welcome email:`, error);
  }
};
