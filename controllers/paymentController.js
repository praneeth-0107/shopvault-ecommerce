const crypto = require('crypto');
const { pool } = require('../config/db');
const { generateId } = require('../utils/helpers');

// Try to load Razorpay, fall back to simulation mode
let Razorpay;
let razorpayInstance;
let isSimulationMode = true;

try {
  Razorpay = require('razorpay');
  if (process.env.RAZORPAY_KEY_ID && !process.env.RAZORPAY_KEY_ID.includes('placeholder')) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID.trim(),
      key_secret: process.env.RAZORPAY_KEY_SECRET.trim()
    });
    isSimulationMode = false;
    console.log('💳 Razorpay: Live mode');
    console.log(`   Key: ${process.env.RAZORPAY_KEY_ID.trim().substring(0, 10)}...  Secret length: ${process.env.RAZORPAY_KEY_SECRET.trim().length}`);
  } else {
    console.log('💳 Razorpay: Simulation mode (set real keys in .env for live payments)');
  }
} catch (e) {
  console.log('💳 Razorpay: Simulation mode (package not available)');
}

/**
 * POST /api/payments/create-order
 * Create a Razorpay order (or simulated order) for payment
 */
async function createPaymentOrder(req, res) {
  try {
    const { orderId } = req.body;
    const customerId = req.user.id;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    // Get order details
    const [orders] = await pool.execute(
      'SELECT * FROM orders WHERE Order_ID = ? AND Customer_ID = ?',
      [orderId, customerId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const order = orders[0];

    // Check if payment already exists
    const [existingPayments] = await pool.execute(
      'SELECT * FROM payments WHERE Order_ID = ? AND Payment_Status = ?',
      [orderId, 'Completed']
    );

    if (existingPayments.length > 0) {
      return res.status(400).json({ success: false, message: 'Payment already completed for this order.' });
    }

    const amount = Math.round(order.Total_Amount * 100); // Amount in paise

    if (!isSimulationMode) {
      // Real Razorpay order
      const razorpayOrder = await razorpayInstance.orders.create({
        amount,
        currency: 'INR',
        receipt: orderId,
        notes: { orderId, customerId }
      });

      res.json({
        success: true,
        mode: 'live',
        razorpayOrder: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency
        },
        key: process.env.RAZORPAY_KEY_ID,
        orderId
      });
    } else {
      // Simulated payment order
      const simulatedOrderId = 'sim_order_' + generateId('');
      res.json({
        success: true,
        mode: 'simulation',
        razorpayOrder: {
          id: simulatedOrderId,
          amount,
          currency: 'INR'
        },
        key: 'sim_key',
        orderId
      });
    }
  } catch (error) {
    console.error('Create payment order error:', error);
    res.status(500).json({ success: false, message: 'Server error creating payment order.' });
  }
}

/**
 * POST /api/payments/verify
 * Verify payment after Razorpay checkout (or simulate verification)
 */
async function verifyPayment(req, res) {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentMode } = req.body;
    const customerId = req.user.id;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    // Get the order
    const [orders] = await pool.execute(
      'SELECT * FROM orders WHERE Order_ID = ? AND Customer_ID = ?',
      [orderId, customerId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    let paymentVerified = false;

    if (!isSimulationMode && razorpaySignature) {
      // Verify Razorpay signature
      const body = razorpayOrderId + '|' + razorpayPaymentId;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      paymentVerified = (expectedSignature === razorpaySignature);
    } else {
      // Simulation mode - auto verify
      paymentVerified = true;
    }

    const paymentId = generateId('PAY');

    if (paymentVerified) {
      // Insert payment record
      await pool.execute(
        `INSERT INTO payments (Payment_ID, Order_ID, Payment_Mode, Amount, Payment_Status, Razorpay_Order_ID, Razorpay_Payment_ID, Razorpay_Signature)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          paymentId, orderId, paymentMode || 'Online',
          orders[0].Total_Amount, 'Completed',
          razorpayOrderId || 'sim_' + Date.now(),
          razorpayPaymentId || 'sim_pay_' + Date.now(),
          razorpaySignature || 'sim_sig_' + Date.now()
        ]
      );

      // Update order status to Confirmed
      await pool.execute(
        'UPDATE orders SET Order_Status = ? WHERE Order_ID = ?',
        ['Confirmed', orderId]
      );

      res.json({
        success: true,
        message: 'Payment verified and order confirmed.',
        payment: {
          paymentId,
          amount: orders[0].Total_Amount,
          status: 'Completed',
          orderId
        }
      });
    } else {
      // Insert failed payment
      await pool.execute(
        `INSERT INTO payments (Payment_ID, Order_ID, Payment_Mode, Amount, Payment_Status, Razorpay_Order_ID, Razorpay_Payment_ID, Razorpay_Signature)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [paymentId, orderId, paymentMode || 'Online', orders[0].Total_Amount, 'Failed', razorpayOrderId, razorpayPaymentId, razorpaySignature]
      );

      res.status(400).json({
        success: false,
        message: 'Payment verification failed.',
        payment: { paymentId, status: 'Failed' }
      });
    }
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ success: false, message: 'Server error verifying payment.' });
  }
}

/**
 * GET /api/payments/:orderId
 * Get payment details for an order
 */
async function getPaymentByOrder(req, res) {
  try {
    const { orderId } = req.params;

    const [payments] = await pool.execute(
      'SELECT * FROM payments WHERE Order_ID = ?',
      [orderId]
    );

    if (payments.length === 0) {
      return res.status(404).json({ success: false, message: 'No payment found for this order.' });
    }

    res.json({ success: true, payment: payments[0] });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { createPaymentOrder, verifyPayment, getPaymentByOrder };
