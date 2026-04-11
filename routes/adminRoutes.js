const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');
const {
  getAllProducts, addProduct, updateProduct, deleteProduct,
  getAllOrders, getOrderDetail, updateOrderStatus,
  getAllCustomers,
  getDashboardSummary, getSalesReport
} = require('../controllers/adminController');

// All admin routes require authentication + admin role
router.use(authenticateToken);
router.use(adminAuth);

// Dashboard
router.get('/dashboard', getDashboardSummary);

// Product management
router.get('/products', getAllProducts);
router.post('/products', addProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Order management
router.get('/orders', getAllOrders);
router.get('/orders/:id', getOrderDetail);
router.put('/orders/:id/status', updateOrderStatus);

// Customer management
router.get('/customers', getAllCustomers);

// Reports
router.get('/reports/sales', getSalesReport);

module.exports = router;
