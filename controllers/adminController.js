const { pool } = require('../config/db');
const { generateId } = require('../utils/helpers');
const { applyExpiryDiscount, applyExpiryDiscountToAll } = require('../utils/expiryDiscount');

// ==========================================
// PRODUCT MANAGEMENT
// ==========================================

/**
 * GET /api/admin/products
 * Get all products including expired (for admin)
 */
async function getAllProducts(req, res) {
  try {
    const [products] = await pool.execute('SELECT * FROM products ORDER BY Created_At DESC');
    const productsWithDiscount = applyExpiryDiscountToAll(products, true); // include expired
    res.json({ success: true, products: productsWithDiscount });
  } catch (error) {
    console.error('Admin get products error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

/**
 * POST /api/admin/products
 * Add a new product
 */
async function addProduct(req, res) {
  try {
    const { productName, category, price, quantity, expiryDate, imageUrl, description } = req.body;

    if (!productName || !price) {
      return res.status(400).json({ success: false, message: 'Product name and price are required.' });
    }

    const productId = generateId('PRD');

    await pool.execute(
      `INSERT INTO products (Product_ID, Product_Name, Category, Price, Quantity, Expiry_Date, Image_URL, Description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [productId, productName, category || 'General', parseFloat(price), parseInt(quantity) || 0, expiryDate || null, imageUrl || null, description || null]
    );

    res.status(201).json({
      success: true,
      message: 'Product added successfully.',
      productId
    });
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

/**
 * PUT /api/admin/products/:id
 * Update product details
 */
async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const { productName, category, price, quantity, expiryDate, imageUrl, description } = req.body;

    const [existing] = await pool.execute('SELECT * FROM products WHERE Product_ID = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const current = existing[0];
    await pool.execute(
      `UPDATE products SET 
        Product_Name = ?,
        Category = ?,
        Price = ?,
        Quantity = ?,
        Expiry_Date = ?,
        Image_URL = ?,
        Description = ?,
        Updated_At = datetime('now')
       WHERE Product_ID = ?`,
      [
        productName || current.Product_Name,
        category || current.Category,
        price ? parseFloat(price) : current.Price,
        quantity !== undefined ? parseInt(quantity) : current.Quantity,
        expiryDate !== undefined ? expiryDate : current.Expiry_Date,
        imageUrl !== undefined ? imageUrl : current.Image_URL,
        description !== undefined ? description : current.Description,
        id
      ]
    );

    res.json({ success: true, message: 'Product updated successfully.' });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

/**
 * DELETE /api/admin/products/:id
 * Delete a product
 */
async function deleteProduct(req, res) {
  try {
    const { id } = req.params;

    const [result] = await pool.execute('DELETE FROM products WHERE Product_ID = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    res.json({ success: true, message: 'Product deleted successfully.' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ==========================================
// ORDER MANAGEMENT
// ==========================================

/**
 * GET /api/admin/orders
 * Get all orders with customer info
 */
async function getAllOrders(req, res) {
  try {
    const { status } = req.query;

    let query = `
      SELECT o.*, c.Name as Customer_Name, c.Email as Customer_Email, c.Mobile_No as Customer_Mobile,
             p.Payment_Status, p.Payment_Mode,
             (SELECT COUNT(*) FROM order_items oi WHERE oi.Order_ID = o.Order_ID) as Item_Count
      FROM orders o
      JOIN customers c ON o.Customer_ID = c.Customer_ID
      LEFT JOIN payments p ON o.Order_ID = p.Order_ID
    `;
    const params = [];

    if (status && status !== 'all') {
      query += ' WHERE o.Order_Status = ?';
      params.push(status);
    }

    query += ' ORDER BY o.Order_Date DESC';

    const [orders] = await pool.execute(query, params);
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Admin get orders error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

/**
 * GET /api/admin/orders/:id
 * Get detailed order info
 */
async function getOrderDetail(req, res) {
  try {
    const { id } = req.params;

    const [orders] = await pool.execute(
      `SELECT o.*, c.Name as Customer_Name, c.Email as Customer_Email, c.Mobile_No as Customer_Mobile, c.Address as Customer_Address
       FROM orders o
       JOIN customers c ON o.Customer_ID = c.Customer_ID
       WHERE o.Order_ID = ?`,
      [id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const [items] = await pool.execute(
      `SELECT oi.*, p.Product_Name, p.Image_URL, p.Category 
       FROM order_items oi 
       JOIN products p ON oi.Product_ID = p.Product_ID 
       WHERE oi.Order_ID = ?`,
      [id]
    );

    const [payments] = await pool.execute('SELECT * FROM payments WHERE Order_ID = ?', [id]);

    res.json({
      success: true,
      order: orders[0],
      items,
      payment: payments.length > 0 ? payments[0] : null
    });
  } catch (error) {
    console.error('Admin get order detail error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

/**
 * PUT /api/admin/orders/:id/status
 * Update order status (Pending → Confirmed → Shipped → Delivered / Cancelled)
 */
async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be one of: ' + validStatuses.join(', ') });
    }

    const [result] = await pool.execute(
      'UPDATE orders SET Order_Status = ? WHERE Order_ID = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // If cancelled, restore stock
    if (status === 'Cancelled') {
      const [items] = await pool.execute('SELECT * FROM order_items WHERE Order_ID = ?', [id]);
      for (const item of items) {
        await pool.execute(
          'UPDATE products SET Quantity = Quantity + ? WHERE Product_ID = ?',
          [item.Quantity, item.Product_ID]
        );
      }
    }

    res.json({ success: true, message: `Order status updated to ${status}.` });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ==========================================
// CUSTOMER MANAGEMENT
// ==========================================

/**
 * GET /api/admin/customers
 * View all registered customers
 */
async function getAllCustomers(req, res) {
  try {
    const [customers] = await pool.execute(
      `SELECT c.Customer_ID, c.Name, c.Email, c.Mobile_No, c.Address, c.Created_At,
              (SELECT COUNT(*) FROM orders o WHERE o.Customer_ID = c.Customer_ID) as Total_Orders,
              (SELECT COALESCE(SUM(o.Total_Amount), 0) FROM orders o WHERE o.Customer_ID = c.Customer_ID AND o.Order_Status != 'Cancelled') as Total_Spent
       FROM customers c
       ORDER BY c.Created_At DESC`
    );
    res.json({ success: true, customers });
  } catch (error) {
    console.error('Admin get customers error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ==========================================
// REPORTS
// ==========================================

/**
 * GET /api/admin/reports/summary
 * Get dashboard summary stats
 */
async function getDashboardSummary(req, res) {
  try {
    const [totalProducts] = await pool.execute('SELECT COUNT(*) as count FROM products');
    const [totalCustomers] = await pool.execute('SELECT COUNT(*) as count FROM customers');
    const [totalOrders] = await pool.execute('SELECT COUNT(*) as count FROM orders');
    const [totalRevenue] = await pool.execute(
      "SELECT COALESCE(SUM(Total_Amount), 0) as revenue FROM orders WHERE Order_Status != 'Cancelled'"
    );
    const [pendingOrders] = await pool.execute("SELECT COUNT(*) as count FROM orders WHERE Order_Status = 'Pending'");
    const [lowStock] = await pool.execute('SELECT COUNT(*) as count FROM products WHERE Quantity <= 10');
    const [expiringProducts] = await pool.execute(
      "SELECT COUNT(*) as count FROM products WHERE Expiry_Date IS NOT NULL AND Expiry_Date <= date('now', '+15 days') AND Expiry_Date > date('now')"
    );
    const [expiredProducts] = await pool.execute(
      "SELECT COUNT(*) as count FROM products WHERE Expiry_Date IS NOT NULL AND Expiry_Date <= date('now')"
    );

    res.json({
      success: true,
      summary: {
        totalProducts: totalProducts[0].count,
        totalCustomers: totalCustomers[0].count,
        totalOrders: totalOrders[0].count,
        totalRevenue: totalRevenue[0].revenue,
        pendingOrders: pendingOrders[0].count,
        lowStock: lowStock[0].count,
        expiringProducts: expiringProducts[0].count,
        expiredProducts: expiredProducts[0].count
      }
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

/**
 * GET /api/admin/reports/sales
 * Get sales reports with date filtering
 */
async function getSalesReport(req, res) {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    let dateFormat;
    switch (groupBy) {
      case 'month':
        dateFormat = '%Y-%m';
        break;
      case 'week':
        dateFormat = '%Y-W%W';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }

    let query = `
      SELECT strftime('${dateFormat}', o.Order_Date) as period,
             COUNT(*) as order_count,
             SUM(o.Total_Amount) as revenue,
             AVG(o.Total_Amount) as avg_order_value
      FROM orders o
      WHERE o.Order_Status != 'Cancelled'
    `;
    const params = [];

    if (startDate) {
      query += ' AND o.Order_Date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND o.Order_Date <= ?';
      params.push(endDate + ' 23:59:59');
    }

    query += ` GROUP BY period ORDER BY period DESC LIMIT 30`;

    const [salesData] = await pool.execute(query, params);

    // Top selling products
    const [topProducts] = await pool.execute(
      `SELECT p.Product_Name, p.Category, SUM(oi.Quantity) as total_sold, SUM(oi.Price * oi.Quantity) as total_revenue
       FROM order_items oi
       JOIN products p ON oi.Product_ID = p.Product_ID
       JOIN orders o ON oi.Order_ID = o.Order_ID
       WHERE o.Order_Status != 'Cancelled'
       GROUP BY oi.Product_ID
       ORDER BY total_sold DESC
       LIMIT 10`
    );

    // Order status distribution
    const [statusDist] = await pool.execute(
      'SELECT Order_Status, COUNT(*) as count FROM orders GROUP BY Order_Status'
    );

    // Category-wise sales
    const [categorySales] = await pool.execute(
      `SELECT p.Category, SUM(oi.Quantity) as total_sold, SUM(oi.Price * oi.Quantity) as total_revenue
       FROM order_items oi
       JOIN products p ON oi.Product_ID = p.Product_ID
       JOIN orders o ON oi.Order_ID = o.Order_ID
       WHERE o.Order_Status != 'Cancelled'
       GROUP BY p.Category
       ORDER BY total_revenue DESC`
    );

    res.json({
      success: true,
      salesData,
      topProducts,
      statusDistribution: statusDist,
      categorySales
    });
  } catch (error) {
    console.error('Sales report error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = {
  getAllProducts, addProduct, updateProduct, deleteProduct,
  getAllOrders, getOrderDetail, updateOrderStatus,
  getAllCustomers,
  getDashboardSummary, getSalesReport
};
