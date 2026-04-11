const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { db, pool, testConnection } = require('./config/db');

// Import routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// API ROUTES
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// ==========================================
// PAGE ROUTES (serve HTML files)
// ==========================================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/products', (req, res) => res.sendFile(path.join(__dirname, 'public', 'products.html')));
app.get('/product/:id', (req, res) => res.sendFile(path.join(__dirname, 'public', 'product-detail.html')));
app.get('/cart', (req, res) => res.sendFile(path.join(__dirname, 'public', 'cart.html')));
app.get('/checkout', (req, res) => res.sendFile(path.join(__dirname, 'public', 'checkout.html')));
app.get('/orders', (req, res) => res.sendFile(path.join(__dirname, 'public', 'orders.html')));

// Admin pages
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html')));
app.get('/admin/products', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin', 'products.html')));
app.get('/admin/orders', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin', 'orders.html')));
app.get('/admin/customers', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin', 'customers.html')));
app.get('/admin/reports', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin', 'reports.html')));

// ==========================================
// DATABASE INITIALIZATION
// ==========================================
function initializeDatabase() {
  try {
    // Helper to clean SQL: remove comment lines and blank lines, then split
    function parseSqlFile(filePath) {
      const raw = fs.readFileSync(filePath, 'utf8');
      // Remove full-line comments and inline comments
      const cleaned = raw
        .split('\n')
        .map(line => line.replace(/--.*$/, '').trim())
        .filter(line => line.length > 0)
        .join('\n');

      return cleaned
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }

    // Execute schema
    const schemaStatements = parseSqlFile(path.join(__dirname, 'models', 'schema.sql'));
    for (const statement of schemaStatements) {
      try {
        db.exec(statement);
      } catch (err) {
        if (!err.message.includes('already exists')) {
          console.warn('Schema warning:', err.message.substring(0, 120));
        }
      }
    }

    // Execute seed data
    const seedPath = path.join(__dirname, 'models', 'seed.sql');
    if (fs.existsSync(seedPath)) {
      const seedStatements = parseSqlFile(seedPath);
      for (const statement of seedStatements) {
        try {
          db.exec(statement);
        } catch (err) {
          if (!err.message.includes('UNIQUE constraint')) {
            console.warn('Seed warning:', err.message.substring(0, 120));
          }
        }
      }
    }

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    process.exit(1);
  }
}

// ==========================================
// START SERVER
// ==========================================
// Initialize database
initializeDatabase();
testConnection();

// For local development: start the server
if (require.main === module) {
  console.log('\n🛒 E-Commerce Website with Secure Payment Integration');
  console.log('═══════════════════════════════════════════════════\n');

  app.listen(PORT, () => {
    console.log(`\n🚀 Server running at http://localhost:${PORT}`);
    console.log(`📱 Customer:  http://localhost:${PORT}`);
    console.log(`🔧 Admin:     http://localhost:${PORT}/admin`);
    console.log(`\n📧 Default Admin Login:`);
    console.log(`   Email:    admin@ecommerce.com`);
    console.log(`   Password: admin123\n`);
  });
}

// For Vercel: export the Express app
module.exports = app;

