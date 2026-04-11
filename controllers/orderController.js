const { pool } = require('../config/db');
const { generateId } = require('../utils/helpers');
const { applyExpiryDiscount } = require('../utils/expiryDiscount');

/**
 * POST /api/orders
 * Place a new order from cart items
 */
async function placeOrder(req, res) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const customerId = req.user.id;
    const { shippingAddress } = req.body;

    // Get cart items with product details
    const [cartItems] = await connection.execute(
      `SELECT c.*, p.Product_Name, p.Price, p.Quantity as Stock, p.Expiry_Date 
       FROM cart c 
       JOIN products p ON c.Product_ID = p.Product_ID 
       WHERE c.Customer_ID = ?`,
      [customerId]
    );

    if (cartItems.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Cart is empty.' });
    }

    // Generate order ID
    const orderId = generateId('ORD');

    // Calculate total with expiry discounts
    let totalAmount = 0;
    const orderItems = [];

    for (const item of cartItems) {
      const productWithDiscount = applyExpiryDiscount(item);

      if (productWithDiscount.Is_Expired) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false, 
          message: `${item.Product_Name} has expired. Please remove it from your cart.` 
        });
      }

      if (item.Quantity > item.Stock) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false, 
          message: `Insufficient stock for ${item.Product_Name}. Only ${item.Stock} available.` 
        });
      }

      const effectivePrice = productWithDiscount.Effective_Price;
      const itemTotal = effectivePrice * item.Quantity;
      totalAmount += itemTotal;

      orderItems.push({
        orderId,
        productId: item.Product_ID,
        quantity: item.Quantity,
        price: effectivePrice,
        discountApplied: productWithDiscount.Auto_Discount
      });
    }

    // Create order
    await connection.execute(
      'INSERT INTO orders (Order_ID, Customer_ID, Order_Status, Total_Amount, Shipping_Address) VALUES (?, ?, ?, ?, ?)',
      [orderId, customerId, 'Pending', Math.round(totalAmount * 100) / 100, shippingAddress || null]
    );

    // Insert order items
    for (const item of orderItems) {
      await connection.execute(
        'INSERT INTO order_items (Order_ID, Product_ID, Quantity, Price, Discount_Applied) VALUES (?, ?, ?, ?, ?)',
        [item.orderId, item.productId, item.quantity, item.price, item.discountApplied]
      );

      // Deduct stock
      await connection.execute(
        'UPDATE products SET Quantity = Quantity - ? WHERE Product_ID = ?',
        [item.quantity, item.productId]
      );
    }

    // Clear customer's cart
    await connection.execute('DELETE FROM cart WHERE Customer_ID = ?', [customerId]);

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Order placed successfully.',
      order: {
        orderId,
        totalAmount: Math.round(totalAmount * 100) / 100,
        itemCount: orderItems.length,
        status: 'Pending'
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Place order error:', error);
    res.status(500).json({ success: false, message: 'Server error while placing order.' });
  } finally {
    connection.release();
  }
}

/**
 * GET /api/orders
 * Get all orders for the logged-in customer
 */
async function getOrders(req, res) {
  try {
    const customerId = req.user.id;

    const [orders] = await pool.execute(
      `SELECT o.*, 
              (SELECT COUNT(*) FROM order_items oi WHERE oi.Order_ID = o.Order_ID) as Item_Count,
              p.Payment_Status, p.Payment_Mode
       FROM orders o
       LEFT JOIN payments p ON o.Order_ID = p.Order_ID
       WHERE o.Customer_ID = ?
       ORDER BY o.Order_Date DESC`,
      [customerId]
    );

    res.json({ success: true, orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

/**
 * GET /api/orders/:id
 * Get single order detail with items
 */
async function getOrderById(req, res) {
  try {
    const { id } = req.params;
    const customerId = req.user.id;

    const [orders] = await pool.execute(
      'SELECT * FROM orders WHERE Order_ID = ? AND Customer_ID = ?',
      [id, customerId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Get order items
    const [items] = await pool.execute(
      `SELECT oi.*, p.Product_Name, p.Image_URL, p.Category 
       FROM order_items oi 
       JOIN products p ON oi.Product_ID = p.Product_ID 
       WHERE oi.Order_ID = ?`,
      [id]
    );

    // Get payment info
    const [payments] = await pool.execute(
      'SELECT * FROM payments WHERE Order_ID = ?',
      [id]
    );

    res.json({
      success: true,
      order: orders[0],
      items,
      payment: payments.length > 0 ? payments[0] : null
    });
  } catch (error) {
    console.error('Get order detail error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { placeOrder, getOrders, getOrderById };
