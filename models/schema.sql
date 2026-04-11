-- ============================================
-- E-Commerce Database Schema (SQLite)
-- ============================================

-- ADMINS TABLE
CREATE TABLE IF NOT EXISTS admins (
    Admin_ID TEXT PRIMARY KEY,
    Name TEXT NOT NULL,
    Email TEXT UNIQUE NOT NULL,
    Password TEXT NOT NULL,
    Mobile_No TEXT,
    Created_At TEXT DEFAULT (datetime('now'))
);

-- CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
    Customer_ID TEXT PRIMARY KEY,
    Name TEXT NOT NULL,
    Email TEXT UNIQUE NOT NULL,
    Password TEXT NOT NULL,
    Mobile_No TEXT,
    Address TEXT,
    Created_At TEXT DEFAULT (datetime('now'))
);

-- PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    Product_ID TEXT PRIMARY KEY,
    Product_Name TEXT NOT NULL,
    Category TEXT,
    Price REAL NOT NULL,
    Quantity INTEGER DEFAULT 0,
    Expiry_Date TEXT,
    Discount INTEGER DEFAULT 0,
    Image_URL TEXT,
    Description TEXT,
    Created_At TEXT DEFAULT (datetime('now')),
    Updated_At TEXT DEFAULT (datetime('now'))
);

-- CART TABLE
CREATE TABLE IF NOT EXISTS cart (
    Cart_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Customer_ID TEXT NOT NULL,
    Product_ID TEXT NOT NULL,
    Quantity INTEGER DEFAULT 1,
    Added_At TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (Customer_ID) REFERENCES customers(Customer_ID) ON DELETE CASCADE,
    FOREIGN KEY (Product_ID) REFERENCES products(Product_ID) ON DELETE CASCADE,
    UNIQUE(Customer_ID, Product_ID)
);

-- ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    Order_ID TEXT PRIMARY KEY,
    Customer_ID TEXT NOT NULL,
    Order_Date TEXT DEFAULT (datetime('now')),
    Order_Status TEXT DEFAULT 'Pending',
    Total_Amount REAL NOT NULL,
    Shipping_Address TEXT,
    FOREIGN KEY (Customer_ID) REFERENCES customers(Customer_ID) ON DELETE CASCADE
);

-- ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
    Item_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Order_ID TEXT NOT NULL,
    Product_ID TEXT NOT NULL,
    Quantity INTEGER NOT NULL,
    Price REAL NOT NULL,
    Discount_Applied INTEGER DEFAULT 0,
    FOREIGN KEY (Order_ID) REFERENCES orders(Order_ID) ON DELETE CASCADE,
    FOREIGN KEY (Product_ID) REFERENCES products(Product_ID) ON DELETE CASCADE
);

-- PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    Payment_ID TEXT PRIMARY KEY,
    Order_ID TEXT NOT NULL,
    Payment_Mode TEXT,
    Amount REAL NOT NULL,
    Payment_Date TEXT DEFAULT (datetime('now')),
    Payment_Status TEXT DEFAULT 'Pending',
    Razorpay_Order_ID TEXT,
    Razorpay_Payment_ID TEXT,
    Razorpay_Signature TEXT,
    FOREIGN KEY (Order_ID) REFERENCES orders(Order_ID) ON DELETE CASCADE
);
