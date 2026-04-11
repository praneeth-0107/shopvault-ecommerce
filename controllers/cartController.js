const { pool } = require('../config/db');
const { applyExpiryDiscount } = require('../utils/expiryDiscount');

/**
 * GET /api/cart
 * Get all cart items for the logged-in customer
 */
async function getCart(req, res) {
  try {
    const customerId = req.user.id;

    const [items] = await pool.execute(
      `SELECT c.Cart_ID, c.Quantity as Cart_Quantity, p.* 
       FROM cart c 
       JOIN products p ON c.Product_ID = p.Product_ID 
       WHERE c.Customer_ID = ?
       ORDER BY c.Added_At DESC`,
      [customerId]
    );

    // Apply expiry discounts to each product
    const cartItems = items.map(item => {
      const productWithDiscount = applyExpiryDiscount(item);
      return {
        ...productWithDiscount,
        Cart_ID: item.Cart_ID,
        Cart_Quantity: item.Cart_Quantity,
        Item_Total: item.Cart_Quantity * productWithDiscount.Effective_Price
      };
    }).filter(item => !item.Is_Expired); // Remove expired products from cart

    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => sum + (item.Cart_Quantity * item.Original_Price), 0);
    const discount = cartItems.reduce((sum, item) => sum + (item.Cart_Quantity * (item.Original_Price - item.Effective_Price)), 0);
    const total = cartItems.reduce((sum, item) => sum + item.Item_Total, 0);

    res.json({
      success: true,
      cart: cartItems,
      summary: {
        itemCount: cartItems.length,
        subtotal: Math.round(subtotal * 100) / 100,
        discount: Math.round(discount * 100) / 100,
        total: Math.round(total * 100) / 100
      }
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

/**
 * POST /api/cart
 * Add a product to cart (or update quantity if already exists)
 */
async function addToCart(req, res) {
  try {
    const customerId = req.user.id;
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required.' });
    }

    // Check product exists and is in stock
    const [products] = await pool.execute('SELECT * FROM products WHERE Product_ID = ?', [productId]);
    if (products.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const product = applyExpiryDiscount(products[0]);
    if (product.Is_Expired) {
      return res.status(400).json({ success: false, message: 'This product has expired and cannot be added to cart.' });
    }

    if (products[0].Quantity < quantity) {
      return res.status(400).json({ success: false, message: `Only ${products[0].Quantity} items available in stock.` });
    }

    // Insert or update cart
    await pool.execute(
      `INSERT INTO cart (Customer_ID, Product_ID, Quantity) 
       VALUES (?, ?, ?) 
       ON CONFLICT(Customer_ID, Product_ID) DO UPDATE SET Quantity = Quantity + excluded.Quantity`,
      [customerId, productId, quantity]
    );

    res.json({ success: true, message: 'Product added to cart.' });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

/**
 * PUT /api/cart/:cartId
 * Update cart item quantity
 */
async function updateCartItem(req, res) {
  try {
    const customerId = req.user.id;
    const { cartId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ success: false, message: 'Quantity must be at least 1.' });
    }

    // Check item belongs to customer
    const [items] = await pool.execute(
      `SELECT c.*, p.Quantity as Stock FROM cart c JOIN products p ON c.Product_ID = p.Product_ID 
       WHERE c.Cart_ID = ? AND c.Customer_ID = ?`,
      [cartId, customerId]
    );

    if (items.length === 0) {
      return res.status(404).json({ success: false, message: 'Cart item not found.' });
    }

    if (quantity > items[0].Stock) {
      return res.status(400).json({ success: false, message: `Only ${items[0].Stock} items available in stock.` });
    }

    await pool.execute('UPDATE cart SET Quantity = ? WHERE Cart_ID = ? AND Customer_ID = ?', [quantity, cartId, customerId]);

    res.json({ success: true, message: 'Cart updated.' });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

/**
 * DELETE /api/cart/:cartId
 * Remove an item from cart
 */
async function removeFromCart(req, res) {
  try {
    const customerId = req.user.id;
    const { cartId } = req.params;

    const [result] = await pool.execute('DELETE FROM cart WHERE Cart_ID = ? AND Customer_ID = ?', [cartId, customerId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Cart item not found.' });
    }

    res.json({ success: true, message: 'Item removed from cart.' });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

/**
 * DELETE /api/cart
 * Clear entire cart for the customer
 */
async function clearCart(req, res) {
  try {
    const customerId = req.user.id;
    await pool.execute('DELETE FROM cart WHERE Customer_ID = ?', [customerId]);
    res.json({ success: true, message: 'Cart cleared.' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { getCart, addToCart, updateCartItem, removeFromCart, clearCart };
