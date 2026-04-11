const express = require('express');
const router = express.Router();
const { getAllProducts, getProductById, getCategories } = require('../controllers/productController');

// Public routes - no authentication needed for browsing
router.get('/categories', getCategories);
router.get('/', getAllProducts);
router.get('/:id', getProductById);

module.exports = router;
