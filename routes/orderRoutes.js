const express = require('express');
const router = express.Router();
const { placeOrder, getOrders, getOrderById } = require('../controllers/orderController');
const { authenticateToken } = require('../middleware/auth');

// All order routes require authentication
router.use(authenticateToken);

router.post('/', placeOrder);
router.get('/', getOrders);
router.get('/:id', getOrderById);

module.exports = router;
