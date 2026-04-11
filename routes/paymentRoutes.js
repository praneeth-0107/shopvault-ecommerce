const express = require('express');
const router = express.Router();
const { createPaymentOrder, verifyPayment, getPaymentByOrder } = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/auth');

// All payment routes require authentication
router.use(authenticateToken);

router.post('/create-order', createPaymentOrder);
router.post('/verify', verifyPayment);
router.get('/:orderId', getPaymentByOrder);

module.exports = router;
