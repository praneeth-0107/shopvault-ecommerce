const { pool } = require('../config/db');
const { applyExpiryDiscount, applyExpiryDiscountToAll } = require('../utils/expiryDiscount');

/**
 * GET /api/products
 * Browse all products with optional search, filter, sort
 * Query params: search, category, minPrice, maxPrice, sort, page, limit
 */
async function getAllProducts(req, res) {
  try {
    const { search, category, minPrice, maxPrice, sort, page = 1, limit = 12 } = req.query;

    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    // Search by name or description
    if (search) {
      query += ' AND (Product_Name LIKE ? OR Description LIKE ? OR Category LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Filter by category
    if (category && category !== 'all') {
      query += ' AND Category = ?';
      params.push(category);
    }

    // Filter by price range
    if (minPrice) {
      query += ' AND Price >= ?';
      params.push(parseFloat(minPrice));
    }
    if (maxPrice) {
      query += ' AND Price <= ?';
      params.push(parseFloat(maxPrice));
    }

    // Sorting
    switch (sort) {
      case 'price_asc':
        query += ' ORDER BY Price ASC';
        break;
      case 'price_desc':
        query += ' ORDER BY Price DESC';
        break;
      case 'name_asc':
        query += ' ORDER BY Product_Name ASC';
        break;
      case 'name_desc':
        query += ' ORDER BY Product_Name DESC';
        break;
      case 'newest':
        query += ' ORDER BY Created_At DESC';
        break;
      case 'expiry':
        query += ' ORDER BY Expiry_Date ASC';
        break;
      default:
        query += ' ORDER BY Created_At DESC';
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [products] = await pool.execute(query, params);

    // Apply auto-expiry discounts (exclude expired for customers)
    const productsWithDiscount = applyExpiryDiscountToAll(products, false);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
    const countParams = [];
    if (search) {
      countQuery += ' AND (Product_Name LIKE ? OR Description LIKE ? OR Category LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (category && category !== 'all') {
      countQuery += ' AND Category = ?';
      countParams.push(category);
    }
    if (minPrice) {
      countQuery += ' AND Price >= ?';
      countParams.push(parseFloat(minPrice));
    }
    if (maxPrice) {
      countQuery += ' AND Price <= ?';
      countParams.push(parseFloat(maxPrice));
    }

    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;

    // Get all categories for filter
    const [categories] = await pool.execute('SELECT DISTINCT Category FROM products ORDER BY Category');

    res.json({
      success: true,
      products: productsWithDiscount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      categories: categories.map(c => c.Category)
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

/**
 * GET /api/products/:id
 * Get single product detail
 */
async function getProductById(req, res) {
  try {
    const { id } = req.params;
    const [products] = await pool.execute('SELECT * FROM products WHERE Product_ID = ?', [id]);

    if (products.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const product = applyExpiryDiscount(products[0]);

    res.json({ success: true, product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

/**
 * GET /api/products/categories/list
 * Get all unique product categories
 */
async function getCategories(req, res) {
  try {
    const [categories] = await pool.execute('SELECT DISTINCT Category FROM products ORDER BY Category');
    res.json({ success: true, categories: categories.map(c => c.Category) });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { getAllProducts, getProductById, getCategories };
