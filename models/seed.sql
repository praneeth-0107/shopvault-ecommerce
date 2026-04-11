-- ============================================
-- Seed Data for E-Commerce (SQLite)
-- ============================================

-- Default Admin (Password: admin123)
INSERT OR IGNORE INTO admins (Admin_ID, Name, Email, Password, Mobile_No)
VALUES ('ADM001', 'System Admin', 'admin@ecommerce.com', '$2a$10$Ufjb6bexzjXQ05kfzvCe8ugwXVHHezU.ioNT/Z4zbzZ3ncQT1v0cS', '9999999999');

-- Sample Products with various expiry dates
INSERT OR IGNORE INTO products (Product_ID, Product_Name, Category, Price, Quantity, Expiry_Date, Discount, Image_URL, Description) VALUES
('PRD001', 'Organic Green Tea', 'Beverages', 299.00, 150, date('now', '+5 days'), 0, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400', 'Premium organic green tea leaves sourced from Darjeeling. Rich in antioxidants and refreshing flavor.');

INSERT OR IGNORE INTO products (Product_ID, Product_Name, Category, Price, Quantity, Expiry_Date, Discount, Image_URL, Description) VALUES
('PRD002', 'Basmati Rice 5kg', 'Groceries', 450.00, 200, date('now', '+90 days'), 0, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400', 'Extra-long grain aged basmati rice. Perfect for biryanis and pulaos.');

INSERT OR IGNORE INTO products (Product_ID, Product_Name, Category, Price, Quantity, Expiry_Date, Discount, Image_URL, Description) VALUES
('PRD003', 'Dark Chocolate Bar', 'Snacks', 150.00, 80, date('now', '+3 days'), 0, 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400', '70% cocoa dark chocolate. Rich, smooth, and indulgent.');

INSERT OR IGNORE INTO products (Product_ID, Product_Name, Category, Price, Quantity, Expiry_Date, Discount, Image_URL, Description) VALUES
('PRD004', 'Almond Milk 1L', 'Dairy Alternatives', 199.00, 60, date('now', '+12 days'), 0, 'https://images.unsplash.com/photo-1600788886242-5c96aabe3757?w=400', 'Unsweetened almond milk. Lactose-free, vegan, and fortified with calcium.');

INSERT OR IGNORE INTO products (Product_ID, Product_Name, Category, Price, Quantity, Expiry_Date, Discount, Image_URL, Description) VALUES
('PRD005', 'Whole Wheat Bread', 'Bakery', 55.00, 100, date('now', '+1 days'), 0, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400', 'Freshly baked whole wheat bread. No preservatives, high in fiber.');

INSERT OR IGNORE INTO products (Product_ID, Product_Name, Category, Price, Quantity, Expiry_Date, Discount, Image_URL, Description) VALUES
('PRD006', 'Extra Virgin Olive Oil 500ml', 'Cooking Oils', 650.00, 45, date('now', '+180 days'), 0, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400', 'Cold-pressed extra virgin olive oil imported from Italy.');

INSERT OR IGNORE INTO products (Product_ID, Product_Name, Category, Price, Quantity, Expiry_Date, Discount, Image_URL, Description) VALUES
('PRD007', 'Protein Energy Bar Pack', 'Health Foods', 350.00, 70, date('now', '+8 days'), 0, 'https://images.unsplash.com/photo-1622484212850-eb596d769edc?w=400', 'Pack of 6 protein bars. 20g protein per bar. Peanut butter flavor.');

INSERT OR IGNORE INTO products (Product_ID, Product_Name, Category, Price, Quantity, Expiry_Date, Discount, Image_URL, Description) VALUES
('PRD008', 'Fresh Orange Juice 1L', 'Beverages', 120.00, 90, date('now', '+2 days'), 0, 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400', '100% fresh squeezed orange juice. No added sugar or preservatives.');

INSERT OR IGNORE INTO products (Product_ID, Product_Name, Category, Price, Quantity, Expiry_Date, Discount, Image_URL, Description) VALUES
('PRD009', 'Greek Yogurt 500g', 'Dairy', 180.00, 55, date('now', '+10 days'), 0, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400', 'Thick and creamy Greek yogurt. High in protein, low in fat.');

INSERT OR IGNORE INTO products (Product_ID, Product_Name, Category, Price, Quantity, Expiry_Date, Discount, Image_URL, Description) VALUES
('PRD010', 'Organic Honey 500g', 'Natural Foods', 420.00, 35, date('now', '+365 days'), 0, 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400', 'Pure organic wildflower honey. Raw and unprocessed.');

INSERT OR IGNORE INTO products (Product_ID, Product_Name, Category, Price, Quantity, Expiry_Date, Discount, Image_URL, Description) VALUES
('PRD011', 'Instant Coffee 200g', 'Beverages', 280.00, 120, date('now', '+14 days'), 0, 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400', 'Premium instant coffee. Rich aroma and smooth taste.');

INSERT OR IGNORE INTO products (Product_ID, Product_Name, Category, Price, Quantity, Expiry_Date, Discount, Image_URL, Description) VALUES
('PRD012', 'Mixed Nuts 250g', 'Snacks', 320.00, 65, date('now', '+60 days'), 0, 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=400', 'Roasted mixed nuts - almonds, cashews, walnuts, and pistachios.');

INSERT OR IGNORE INTO products (Product_ID, Product_Name, Category, Price, Quantity, Expiry_Date, Discount, Image_URL, Description) VALUES
('PRD013', 'Coconut Water Pack', 'Beverages', 90.00, 110, date('now', '+0 days'), 0, 'https://images.unsplash.com/photo-1525385133512-2f3bdd6d6e4f?w=400', 'Pack of 6 natural coconut water cans. Refreshing and hydrating.');

INSERT OR IGNORE INTO products (Product_ID, Product_Name, Category, Price, Quantity, Expiry_Date, Discount, Image_URL, Description) VALUES
('PRD014', 'Quinoa 500g', 'Health Foods', 380.00, 40, date('now', '+200 days'), 0, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400', 'Organic white quinoa. Gluten-free superfood rich in protein.');

INSERT OR IGNORE INTO products (Product_ID, Product_Name, Category, Price, Quantity, Expiry_Date, Discount, Image_URL, Description) VALUES
('PRD015', 'Granola Cereal 400g', 'Breakfast', 220.00, 85, date('now', '+7 days'), 0, 'https://images.unsplash.com/photo-1517093157656-b9eccef91cb1?w=400', 'Crunchy granola with dried fruits and nuts. Perfect breakfast cereal.');
