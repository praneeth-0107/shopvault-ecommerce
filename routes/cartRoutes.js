const express = require('express');
const router = express.Router();
const { getCart, addToCart, updateCartItem, removeFromCart, clearCart } = require('../controllers/cartController');
const { authenticateToken } = require('../middleware/auth');

// All cart routes require authentication
router.use(authenticateToken);

router.get('/', getCart);
router.post('/', addToCart);
router.put('/:cartId', updateCartItem);
router.delete('/clear', clearCart);
router.delete('/:cartId', removeFromCart);

module.exports = router;
