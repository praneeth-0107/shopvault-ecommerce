const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { generateToken } = require('../middleware/auth');
const { generateId, isValidEmail, isValidMobile, isValidPassword } = require('../utils/helpers');

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
 * POST /api/auth/verify-forgot-password
 * Verify user exists by name and email
 */
async function verifyForgotPassword(req, res) {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format.' });
    }

    // Check customers table
    const [customers] = await pool.execute(
      'SELECT Customer_ID, Name, Email FROM customers WHERE Email = ? AND Name = ?',
      [email, name]
    );

    if (customers.length > 0) {
      return res.json({ success: true, message: 'User verified. You can now reset your password.', userType: 'customer' });
    }

    // Check admins table
    const [admins] = await pool.execute(
      'SELECT Admin_ID, Name, Email FROM admins WHERE Email = ? AND Name = ?',
      [email, name]
    );

    if (admins.length > 0) {
      return res.json({ success: true, message: 'User verified. You can now reset your password.', userType: 'admin' });
    }

    return res.status(404).json({ success: false, message: 'No user found with that name and email combination.' });
  } catch (error) {
    console.error('Verify forgot password error:', error);
    res.status(500).json({ success: false, message: 'Server error during verification.' });
  }
}

/**
 * POST /api/auth/reset-password
 * Reset user password after verification
 */
async function resetPassword(req, res) {
  try {
    const { name, email, newPassword } = req.body;

    if (!name || !email || !newPassword) {
      return res.status(400).json({ success: false, message: 'Name, email, and new password are required.' });
    }

    if (!isValidPassword(newPassword)) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Try updating customer first
    const [customers] = await pool.execute(
      'SELECT Customer_ID FROM customers WHERE Email = ? AND Name = ?',
      [email, name]
    );

    if (customers.length > 0) {
      await pool.execute('UPDATE customers SET Password = ? WHERE Email = ? AND Name = ?', [hashedPassword, email, name]);
      return res.json({ success: true, message: 'Password reset successfully! You can now login with your new password.' });
    }

    // Try updating admin
    const [admins] = await pool.execute(
      'SELECT Admin_ID FROM admins WHERE Email = ? AND Name = ?',
      [email, name]
    );

    if (admins.length > 0) {
      await pool.execute('UPDATE admins SET Password = ? WHERE Email = ? AND Name = ?', [hashedPassword, email, name]);
      return res.json({ success: true, message: 'Password reset successfully! You can now login with your new password.' });
    }

    return res.status(404).json({ success: false, message: 'No user found. Please verify your details.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error during password reset.' });
  }
}

module.exports = { register, login, getProfile, verifyForgotPassword, resetPassword };
