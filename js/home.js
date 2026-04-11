/**
 * home.js — Homepage logic: load featured (discounted) products
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Hide register button if already logged in
  const user = getUser();
  if (user) {
    const btn = document.getElementById('heroRegisterBtn');
    if (btn) btn.style.display = 'none';
  }

  // Load featured / discounted products
  await loadFeaturedProducts();
});

async function loadFeaturedProducts() {
  const container = document.getElementById('featuredProducts');

  const { ok, data } = await apiGet('/api/products?sort=expiry&limit=8');

  if (!ok || !data.products || data.products.length === 0) {
    container.innerHTML = '<p class="text-center text-muted" style="grid-column:1/-1;">No products available yet.</p>';
    return;
  }

  // Prioritize products with discounts
  const sorted = [...data.products].sort((a, b) => b.Auto_Discount - a.Auto_Discount);

  container.innerHTML = sorted.slice(0, 8).map(product => renderProductCard(product)).join('');
}

function renderProductCard(p) {
  const hasDiscount = p.Auto_Discount > 0;
  const imgSrc = p.Image_URL || 'https://via.placeholder.com/400x300?text=No+Image';

  return `
    <div class="product-card" onclick="window.location.href='/product/${p.Product_ID}'">
      <div class="product-image">
        <img src="${imgSrc}" alt="${p.Product_Name}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x300?text=Image+Error'">
        ${hasDiscount ? `<span class="product-badge badge-discount">${p.Auto_Discount}% OFF</span>` : ''}
        <span class="badge-category">${p.Category || 'General'}</span>
      </div>
      <div class="product-info">
        ${p.Discount_Label ? `<div class="expiry-indicator ${p.Remaining_Days <= 2 ? 'danger' : ''}"><span class="expiry-dot"></span> ${p.Discount_Label}</div>` : ''}
        <div class="product-name">${p.Product_Name}</div>
        <div class="product-desc">${p.Description || ''}</div>
        <div class="product-pricing">
          <span class="product-price">${formatCurrency(p.Effective_Price)}</span>
          ${hasDiscount ? `<span class="product-original-price">${formatCurrency(p.Original_Price)}</span>` : ''}
          ${hasDiscount ? `<span class="product-discount-tag">Save ${p.Auto_Discount}%</span>` : ''}
        </div>
        <div class="product-actions">
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); addToCartQuick('${p.Product_ID}')">Add to Cart</button>
          <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); window.location.href='/product/${p.Product_ID}'">Details</button>
        </div>
      </div>
    </div>
  `;
}

async function addToCartQuick(productId) {
  if (!isLoggedIn()) {
    showToast('Please login to add items to cart.', 'warning');
    setTimeout(() => window.location.href = '/login', 1000);
    return;
  }

  const { ok, data } = await apiPost('/api/cart', { productId, quantity: 1 });
  if (ok) {
    showToast('Added to cart! 🛒', 'success');
    updateCartBadge();
  } else {
    showToast(data.message || 'Failed to add to cart.', 'error');
  }
}
