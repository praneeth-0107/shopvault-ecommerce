/**
 * Admin Authorization Middleware
 * Must be used after authenticateToken middleware
 * Checks if the authenticated user has admin role
 */
function adminAuth(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Admin privileges required.' 
    });
  }
  next();
}

module.exports = { adminAuth };
