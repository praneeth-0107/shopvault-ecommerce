const express = require('express');
const router = express.Router();
const { register, login, getProfile, verifyForgotPassword, resetPassword } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/verify-forgot-password', verifyForgotPassword);
router.post('/reset-password', resetPassword);

// Protected route
router.get('/profile', authenticateToken, getProfile);

module.exports = router;

