const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { pool } = require('../config/db');
const { generateToken } = require('../middleware/auth');
const { generateId, isValidEmail, isValidMobile, isValidPassword } = require('../utils/helpers');

// ==========================================
// EMAIL TRANSPORTER (Gmail SMTP)
// ==========================================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Send a password reset email with a styled HTML template
 */
async function sendResetEmail(toEmail, resetLink, userName) {
  const mailOptions = {
    from: `"ShopVault" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: '🔑 Reset Your ShopVault Password',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a1a; border-radius: 16px; overflow: hidden; border: 1px solid #1e1e3a;">
        <div style="background: linear-gradient(135deg, #6C5CE7, #00D2FF); padding: 32px; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 28px;">🛒 ShopVault</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Password Reset Request</p>
        </div>
        <div style="padding: 32px; color: #e0e0e0;">
          <p style="font-size: 16px; margin: 0 0 16px;">Hi <strong style="color: #00D2FF;">${userName || 'there'}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6; color: #aaa;">
            We received a request to reset the password for your ShopVault account. Click the button below to set a new password:
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetLink}" style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #6C5CE7, #00D2FF); color: #fff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 15px rgba(108,92,231,0.4);">
              Reset My Password
            </a>
          </div>
          <p style="font-size: 12px; color: #666; text-align: center;">
            This link will expire in <strong style="color: #e0e0e0;">15 minutes</strong>.
          </p>
          <hr style="border: none; border-top: 1px solid #1e1e3a; margin: 24px 0;">
          <p style="font-size: 12px; color: #555; line-height: 1.5;">
            If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </p>
          <p style="font-size: 11px; color: #444; margin-top: 16px;">
            Can't click the button? Copy and paste this link into your browser:<br>
            <a href="${resetLink}" style="color: #6C5CE7; word-break: break-all;">${resetLink}</a>
          </p>
        </div>
        <div style="background: #06060f; padding: 16px; text-align: center;">
          <p style="color: #444; font-size: 11px; margin: 0;">© ${new Date().getFullYear()} ShopVault. All rights reserved.</p>
        </div>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
}

/**
 * POST /api/auth/register
 * Register a new customer
 */
async function register(req, res) {
  try {
    const { name, email, password, mobile, address } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format.' });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    if (mobile && !isValidMobile(mobile)) {
      return res.status(400).json({ success: false, message: 'Mobile number must be 10 digits.' });
    }

    // Check if email already exists
    const [existing] = await pool.execute('SELECT Customer_ID FROM customers WHERE Email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate unique customer ID
    const customerId = generateId('CUS');

    // Insert customer
    await pool.execute(
      'INSERT INTO customers (Customer_ID, Name, Email, Password, Mobile_No, Address) VALUES (?, ?, ?, ?, ?, ?)',
      [customerId, name, email, hashedPassword, mobile || null, address || null]
    );

    // Generate token
    const token = generateToken({ id: customerId, email, role: 'customer', name });

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      token,
      user: { id: customerId, name, email, role: 'customer' }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
}

/**
 * POST /api/auth/login
 * Login for both customers and admins
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    // Check admin first
    const [admins] = await pool.execute('SELECT * FROM admins WHERE Email = ?', [email]);
    if (admins.length > 0) {
      const admin = admins[0];
      const isMatch = await bcrypt.compare(password, admin.Password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });
      }

      const token = generateToken({ id: admin.Admin_ID, email: admin.Email, role: 'admin', name: admin.Name });
      return res.json({
        success: true,
        message: 'Admin login successful.',
        token,
        user: { id: admin.Admin_ID, name: admin.Name, email: admin.Email, role: 'admin' }
      });
    }

    // Check customer
    const [customers] = await pool.execute('SELECT * FROM customers WHERE Email = ?', [email]);
    if (customers.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const customer = customers[0];
    const isMatch = await bcrypt.compare(password, customer.Password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = generateToken({ id: customer.Customer_ID, email: customer.Email, role: 'customer', name: customer.Name });
    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: { id: customer.Customer_ID, name: customer.Name, email: customer.Email, role: 'customer' }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
}

/**
 * GET /api/auth/profile
 * Get current user profile
 */
async function getProfile(req, res) {
  try {
    const { id, role } = req.user;

    if (role === 'admin') {
      const [rows] = await pool.execute('SELECT Admin_ID, Name, Email, Mobile_No, Created_At FROM admins WHERE Admin_ID = ?', [id]);
      if (rows.length === 0) return res.status(404).json({ success: false, message: 'Admin not found.' });
      return res.json({ success: true, user: { ...rows[0], role: 'admin' } });
    }

    const [rows] = await pool.execute('SELECT Customer_ID, Name, Email, Mobile_No, Address, Created_At FROM customers WHERE Customer_ID = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Customer not found.' });
    res.json({ success: true, user: { ...rows[0], role: 'customer' } });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

/**
 * PUT /api/auth/profile
 * Update current user profile
 */
async function updateProfile(req, res) {
  try {
    const { id, role } = req.user;
    const { name, mobile, address } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required.' });
    }

    if (mobile && !isValidMobile(mobile)) {
      return res.status(400).json({ success: false, message: 'Mobile number must be 10 digits.' });
    }

    if (role === 'admin') {
      await pool.execute(
        'UPDATE admins SET Name = ?, Mobile_No = ? WHERE Admin_ID = ?',
        [name.trim(), mobile || null, id]
      );
    } else {
      await pool.execute(
        'UPDATE customers SET Name = ?, Mobile_No = ?, Address = ? WHERE Customer_ID = ?',
        [name.trim(), mobile || null, address || null, id]
      );
    }

    res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error during profile update.' });
  }
}

/**
 * POST /api/auth/forgot-password
 * Send password reset email with a token link
 */
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format.' });
    }

    // Look up user in customers
    let userName = null;
    let userType = null;

    const [customers] = await pool.execute('SELECT Customer_ID, Name, Email FROM customers WHERE Email = ?', [email]);
    if (customers.length > 0) {
      userName = customers[0].Name;
      userType = 'customer';
    }

    // If not found in customers, check admins
    if (!userType) {
      const [admins] = await pool.execute('SELECT Admin_ID, Name, Email FROM admins WHERE Email = ?', [email]);
      if (admins.length > 0) {
        userName = admins[0].Name;
        userType = 'admin';
      }
    }

    // Always return success (don't reveal if email exists — security best practice)
    if (!userType) {
      // Still return success to prevent email enumeration
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate a short-lived JWT reset token (15 min)
    const resetToken = jwt.sign(
      { email, userType, purpose: 'password-reset' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Build reset link dynamically with strong fallback logic
    // 1. Use explicitly configured BASE_URL from environment variables (Priority)
    // 2. Fallback to request headers, ensuring HTTPS in production
    let baseUrl = process.env.BASE_URL;

    if (!baseUrl) {
      console.warn('⚠️ process.env.BASE_URL is missing. Falling back to request headers.');
      let protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      
      // Force HTTPS in production, or if deployed in environments like Vercel/Railway
      if (process.env.NODE_ENV === 'production' || process.env.VERCEL || process.env.RAILWAY_ENVIRONMENT) {
        protocol = 'https';
      }

      const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
      baseUrl = `${protocol}://${host}`;
    }

    // Clean up base URL and construct the secure token-based link
    baseUrl = baseUrl.replace(/\/$/, '');
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

    // Send email
    try {
      await sendResetEmail(email, resetLink, userName);
      console.log(`📧 Password reset email sent to ${email}`);
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to send reset email. Please check email configuration.'
      });
    }

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

/**
 * POST /api/auth/reset-password
 * Reset password using the token from the email link
 */
async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Token and new password are required.' });
    }

    if (!isValidPassword(newPassword)) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    // Verify the reset token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (tokenError) {
      return res.status(400).json({
        success: false,
        message: 'Reset link has expired or is invalid. Please request a new one.'
      });
    }

    // Ensure it's a password reset token
    if (decoded.purpose !== 'password-reset') {
      return res.status(400).json({ success: false, message: 'Invalid reset token.' });
    }

    const { email, userType } = decoded;

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the password
    if (userType === 'customer') {
      const [result] = await pool.execute('UPDATE customers SET Password = ? WHERE Email = ?', [hashedPassword, email]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }
    } else if (userType === 'admin') {
      const [result] = await pool.execute('UPDATE admins SET Password = ? WHERE Email = ?', [hashedPassword, email]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Invalid user type in token.' });
    }

    console.log(`✅ Password reset successful for ${email}`);
    res.json({ success: true, message: 'Password reset successfully! You can now login with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error during password reset.' });
  }
}

module.exports = { register, login, getProfile, updateProfile, forgotPassword, resetPassword };
