/**
 * Auto Expiry Discount Module
 * 
 * Automatically calculates discount based on how close a product is to its expiry date.
 * 
 * Discount Tiers:
 * ───────────────────────────────────────
 *  Remaining Days    │  Discount
 * ───────────────────────────────────────
 *  > 15 days         │  No discount (0%)
 *  ≤ 15 and > 10     │  50%
 *  ≤ 10 and > 5      │  70%
 *  ≤ 5 and > 2       │  80%
 *  2 days            │  85%
 *  1 day             │  90%
 *  ≤ 0 (expired)     │  Product expired
 * ───────────────────────────────────────
 */

/**
 * Calculate the auto-expiry discount for a product
 * @param {string|Date} expiryDate - Product expiry date
 * @returns {object} { remainingDays, discount, isExpired, label }
 */
function calculateExpiryDiscount(expiryDate) {
  if (!expiryDate) {
    return { remainingDays: null, discount: 0, isExpired: false, label: 'No expiry' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  const timeDiff = expiry.getTime() - today.getTime();
  const remainingDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  // Product is expired
  if (remainingDays <= 0) {
    return { remainingDays: 0, discount: 100, isExpired: true, label: 'Product Expired' };
  }

  // 1 day remaining → 90% discount
  if (remainingDays === 1) {
    return { remainingDays, discount: 90, isExpired: false, label: 'Expires Tomorrow – 90% OFF!' };
  }

  // 2 days remaining → 85% discount
  if (remainingDays === 2) {
    return { remainingDays, discount: 85, isExpired: false, label: '2 Days Left – 85% OFF!' };
  }

  // ≤ 5 and > 2 days → 80% discount
  if (remainingDays <= 5) {
    return { remainingDays, discount: 80, isExpired: false, label: `${remainingDays} Days Left – 80% OFF!` };
  }

  // ≤ 10 and > 5 days → 70% discount
  if (remainingDays <= 10) {
    return { remainingDays, discount: 70, isExpired: false, label: `${remainingDays} Days Left – 70% OFF!` };
  }

  // ≤ 15 and > 10 days → 50% discount
  if (remainingDays <= 15) {
    return { remainingDays, discount: 50, isExpired: false, label: `${remainingDays} Days Left – 50% OFF!` };
  }

  // > 15 days → no discount
  return { remainingDays, discount: 0, isExpired: false, label: '' };
}

/**
 * Apply expiry discount to a product object
 * Adds discount info fields to the product
 * @param {object} product - Product row from database
 * @returns {object} Product with discount info
 */
function applyExpiryDiscount(product) {
  const discountInfo = calculateExpiryDiscount(product.Expiry_Date);
  
  const discountedPrice = discountInfo.discount > 0 && !discountInfo.isExpired
    ? Math.round(product.Price * (1 - discountInfo.discount / 100) * 100) / 100
    : product.Price;

  return {
    ...product,
    Original_Price: product.Price,
    Discounted_Price: discountedPrice,
    Auto_Discount: discountInfo.discount,
    Remaining_Days: discountInfo.remainingDays,
    Is_Expired: discountInfo.isExpired,
    Discount_Label: discountInfo.label,
    Effective_Price: discountInfo.isExpired ? null : discountedPrice
  };
}

/**
 * Apply expiry discounts to an array of products
 * Filters out expired products by default
 * @param {Array} products - Array of products from database
 * @param {boolean} includeExpired - Whether to include expired products (for admin)
 * @returns {Array} Products with discount info
 */
function applyExpiryDiscountToAll(products, includeExpired = false) {
  return products
    .map(applyExpiryDiscount)
    .filter(p => includeExpired || !p.Is_Expired);
}

module.exports = { calculateExpiryDiscount, applyExpiryDiscount, applyExpiryDiscountToAll };
