/**
 * product-detail.js — Single product detail view with add-to-cart
 */
document.addEventListener('DOMContentLoaded', async () => {
  const pathParts = window.location.pathname.split('/');
  const productId = pathParts[pathParts.length - 1];

  if (!productId) {
    document.getElementById('productDetail').innerHTML = '<div class="empty-state"><h3>Product not found</h3></div>';
    return;
  }

  await loadProduct(productId);
});

async function loadProduct(productId) {
  const container = document.getElementById('productDetail');

  const { ok, data } = await apiGet(`/api/products/${productId}`);

  if (!ok || !data.product) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">😕</div>
        <h3>Product not found</h3>
        <p>This product may no longer be available.</p>
        <a href="/products" class="btn btn-primary">Browse Products</a>
      </div>
    `;
    return;
  }

  const p = data.product;
  const hasDiscount = p.Auto_Discount > 0;
  const imgSrc = p.Image_URL || 'https://via.placeholder.com/600x400?text=No+Image';

  document.title = `${p.Product_Name} — ShopVault`;

  container.innerHTML = `
    <a href="/products" class="btn btn-ghost btn-sm mb-lg">← Back to Products</a>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:48px; align-items:start;">
      <div style="position:relative; border-radius:var(--radius-lg); overflow:hidden; background:var(--bg-secondary);">
        <img src="${imgSrc}" alt="${p.Product_Name}" style="width:100%; height:450px; object-fit:cover;"
             onerror="this.src='https://via.placeholder.com/600x400?text=Image+Error'">
        ${hasDiscount ? `<span class="product-badge badge-discount" style="font-size:16px; padding:8px 20px;">${p.Auto_Discount}% OFF</span>` : ''}
        ${p.Is_Expired ? `<span class="product-badge badge-expired" style="font-size:16px; padding:8px 20px;">EXPIRED</span>` : ''}
      </div>
      <div>
        <span class="badge-category" style="position:static; display:inline-block; margin-bottom:16px;">${p.Category || 'General'}</span>
        <h1 style="font-size:var(--font-3xl); font-weight:800; margin-bottom:12px;">${p.Product_Name}</h1>
        <p style="color:var(--text-secondary); line-height:1.8; margin-bottom:24px;">${p.Description || 'No description available.'}</p>
        
        ${p.Discount_Label ? `
          <div class="expiry-indicator ${p.Remaining_Days <= 2 ? 'danger' : ''}" style="font-size:14px; margin-bottom:16px;">
            <span class="expiry-dot"></span> ${p.Discount_Label}
          </div>
        ` : ''}

        <div style="margin-bottom:24px;">
          <span style="font-size:var(--font-4xl); font-weight:800; color:var(--accent);">${formatCurrency(p.Effective_Price || p.Price)}</span>
          ${hasDiscount ? `
            <span style="font-size:var(--font-xl); color:var(--text-muted); text-decoration:line-through; margin-left:12px;">${formatCurrency(p.Original_Price)}</span>
            <span class="product-discount-tag" style="font-size:14px; margin-left:8px;">Save ${p.Auto_Discount}%</span>
          ` : ''}
        </div>

        <div style="display:flex; gap:16px; align-items:center; margin-bottom:32px; padding:20px; background:var(--bg-secondary); border-radius:var(--radius-md);">
          <div>
            <span style="font-size:13px; color:var(--text-muted);">Availability:</span><br>
            <strong style="color:${p.Quantity > 0 ? 'var(--accent-success)' : 'var(--accent-danger)'}">
              ${p.Quantity > 0 ? `In Stock (${p.Quantity} left)` : 'Out of Stock'}
            </strong>
          </div>
          ${p.Expiry_Date ? `
          <div style="margin-left:auto;">
            <span style="font-size:13px; color:var(--text-muted);">Expiry Date:</span><br>
            <strong>${formatDate(p.Expiry_Date)}</strong>
          </div>
          ` : ''}
        </div>

        ${!p.Is_Expired && p.Quantity > 0 ? `
          <div style="display:flex; gap:12px; align-items:center; margin-bottom:24px;">
            <label style="font-size:14px; color:var(--text-secondary);">Qty:</label>
            <div class="quantity-control">
              <button onclick="changeQty(-1)">−</button>
              <span id="qty">1</span>
              <button onclick="changeQty(1)">+</button>
            </div>
          </div>
          <div style="display:flex; gap:12px;">
            <button class="btn btn-primary btn-lg" onclick="addToCartDetail('${p.Product_ID}')">🛒 Add to Cart</button>
            <button class="btn btn-accent btn-lg" onclick="buyNow('${p.Product_ID}')">⚡ Buy Now</button>
          </div>
        ` : `
          <div class="btn btn-ghost btn-lg" style="opacity:0.5; cursor:not-allowed;">
            ${p.Is_Expired ? '⛔ Product Expired' : '⛔ Out of Stock'}
          </div>
        `}
      </div>
    </div>
  `;
}

let maxQty = 99;

function changeQty(delta) {
  const el = document.getElementById('qty');
  let qty = parseInt(el.textContent) + delta;
  if (qty < 1) qty = 1;
  if (qty > maxQty) qty = maxQty;
  el.textContent = qty;
}

async function addToCartDetail(productId) {
  if (!isLoggedIn()) {
    showToast('Please login to add items to cart.', 'warning');
    setTimeout(() => window.location.href = '/login', 1000);
    return;
  }

  const qty = parseInt(document.getElementById('qty').textContent);
  const { ok, data } = await apiPost('/api/cart', { productId, quantity: qty });

  if (ok) {
    showToast(`Added ${qty} item(s) to cart! 🛒`, 'success');
    updateCartBadge();
  } else {
    showToast(data.message || 'Failed to add to cart.', 'error');
  }
}

async function buyNow(productId) {
  if (!isLoggedIn()) {
    showToast('Please login to purchase.', 'warning');
    setTimeout(() => window.location.href = '/login', 1000);
    return;
  }

  const qty = parseInt(document.getElementById('qty').textContent);
  const { ok, data } = await apiPost('/api/cart', { productId, quantity: qty });

  if (ok) {
    updateCartBadge();
    window.location.href = '/checkout';
  } else {
    showToast(data.message || 'Failed to add to cart.', 'error');
  }
}
