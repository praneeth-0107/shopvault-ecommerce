/**
 * cart.js — Cart page: view, update, remove items
 */
document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  loadCart();
});

async function loadCart() {
  const itemsContainer = document.getElementById('cartItems');
  const summaryContainer = document.getElementById('cartSummary');

  const { ok, data } = await apiGet('/api/cart');

  if (!ok || !data.cart || data.cart.length === 0) {
    document.getElementById('cartLayout').style.gridTemplateColumns = '1fr';
    itemsContainer.innerHTML = `
      <div class="empty-state">
        <div class="icon">🛒</div>
        <h3>Your cart is empty</h3>
        <p>Looks like you haven't added any products yet.</p>
        <a href="/products" class="btn btn-primary">Start Shopping</a>
      </div>
    `;
    summaryContainer.innerHTML = '';
    return;
  }

  // Render cart items
  itemsContainer.innerHTML = `<div class="cart-items">` +
    data.cart.map(item => {
      const hasDiscount = item.Auto_Discount > 0;
      const imgSrc = item.Image_URL || 'https://via.placeholder.com/100x100?text=No+Image';
      return `
        <div class="cart-item" id="cart-item-${item.Cart_ID}">
          <img src="${imgSrc}" alt="${item.Product_Name}" class="cart-item-image"
               onerror="this.src='https://via.placeholder.com/100x100?text=Error'">
          <div class="cart-item-info">
            <div class="cart-item-name">${item.Product_Name}</div>
            ${item.Discount_Label ? `<div class="expiry-indicator" style="margin:4px 0;"><span class="expiry-dot"></span> ${item.Discount_Label}</div>` : ''}
            <div>
              <span class="cart-item-price">${formatCurrency(item.Effective_Price)}</span>
              ${hasDiscount ? `<span class="cart-item-original">${formatCurrency(item.Original_Price)}</span>` : ''}
            </div>
          </div>
          <div class="quantity-control">
            <button onclick="updateQty(${item.Cart_ID}, ${item.Cart_Quantity - 1})">−</button>
            <span>${item.Cart_Quantity}</span>
            <button onclick="updateQty(${item.Cart_ID}, ${item.Cart_Quantity + 1})">+</button>
          </div>
          <div class="cart-item-total">${formatCurrency(item.Item_Total)}</div>
          <button class="cart-item-remove" onclick="removeItem(${item.Cart_ID})" title="Remove">✕</button>
        </div>
      `;
    }).join('') +
    `</div>`;

  // Render summary
  const s = data.summary;
  summaryContainer.innerHTML = `
    <div class="cart-summary">
      <h3>Order Summary</h3>
      <div class="summary-row">
        <span>Items (${s.itemCount})</span>
        <span>${formatCurrency(s.subtotal)}</span>
      </div>
      ${s.discount > 0 ? `
        <div class="summary-row">
          <span>Expiry Discount</span>
          <span class="discount">-${formatCurrency(s.discount)}</span>
        </div>
      ` : ''}
      <div class="summary-row">
        <span>Shipping</span>
        <span style="color:var(--accent-success)">Free</span>
      </div>
      <div class="summary-row total">
        <span>Total</span>
        <span>${formatCurrency(s.total)}</span>
      </div>
      <a href="/checkout" class="btn btn-primary btn-block btn-lg mt-lg">Proceed to Checkout</a>
      <a href="/products" class="btn btn-ghost btn-block btn-sm mt-md">Continue Shopping</a>
    </div>
  `;
}

async function updateQty(cartId, newQty) {
  if (newQty < 1) {
    removeItem(cartId);
    return;
  }

  const { ok, data } = await apiPut(`/api/cart/${cartId}`, { quantity: newQty });
  if (ok) {
    loadCart();
    updateCartBadge();
  } else {
    showToast(data.message || 'Failed to update quantity.', 'error');
  }
}

async function removeItem(cartId) {
  const { ok, data } = await apiDelete(`/api/cart/${cartId}`);
  if (ok) {
    showToast('Item removed from cart.', 'info');
    loadCart();
    updateCartBadge();
  } else {
    showToast(data.message || 'Failed to remove item.', 'error');
  }
}
