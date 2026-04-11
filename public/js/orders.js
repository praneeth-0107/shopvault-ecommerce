/**
 * orders.js — Order history with detail view
 */
document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  loadOrders();
});

async function loadOrders() {
  const container = document.getElementById('ordersList');

  const { ok, data } = await apiGet('/api/orders');

  if (!ok || !data.orders || data.orders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📦</div>
        <h3>No orders yet</h3>
        <p>Start shopping to see your orders here!</p>
        <a href="/products" class="btn btn-primary">Browse Products</a>
      </div>
    `;
    return;
  }

  container.innerHTML = data.orders.map(order => `
    <div class="order-card" onclick="viewOrderDetail('${order.Order_ID}')" style="cursor:pointer;">
      <div class="order-header">
        <div>
          <span class="order-id">📦 ${order.Order_ID}</span>
          <span class="order-date" style="margin-left:16px;">${formatDateTime(order.Order_Date)}</span>
        </div>
        <div style="display:flex; gap:12px; align-items:center;">
          <span class="order-status ${getStatusClass(order.Order_Status)}">${order.Order_Status}</span>
          ${order.Payment_Status ? `
            <span style="font-size:12px; color:${order.Payment_Status === 'Completed' ? 'var(--accent-success)' : 'var(--accent-warning)'}">
              💳 ${order.Payment_Status}
            </span>
          ` : ''}
        </div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:13px; color:var(--text-muted);">${order.Item_Count || '?'} item(s)</span>
        <span class="order-total">${formatCurrency(order.Total_Amount)}</span>
      </div>
    </div>
  `).join('');
}

async function viewOrderDetail(orderId) {
  document.getElementById('orderDetailTitle').textContent = `Order: ${orderId}`;
  document.getElementById('orderDetailContent').innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
  document.getElementById('orderDetailModal').classList.add('active');

  const { ok, data } = await apiGet(`/api/orders/${orderId}`);

  if (!ok) {
    document.getElementById('orderDetailContent').innerHTML = '<p>Failed to load order details.</p>';
    return;
  }

  const order = data.order;
  const items = data.items;
  const payment = data.payment;

  document.getElementById('orderDetailContent').innerHTML = `
    <div style="margin-bottom:20px;">
      <div class="flex-between mb-md">
        <span class="order-status ${getStatusClass(order.Order_Status)}">${order.Order_Status}</span>
        <span style="font-size:13px; color:var(--text-muted);">${formatDateTime(order.Order_Date)}</span>
      </div>
      ${order.Shipping_Address ? `
        <div style="padding:12px; background:var(--bg-secondary); border-radius:var(--radius-md); margin-bottom:16px;">
          <span style="font-size:12px; color:var(--text-muted);">Shipping Address:</span>
          <p style="font-size:14px; margin-top:4px;">${order.Shipping_Address}</p>
        </div>
      ` : ''}
    </div>
    <h4 style="margin-bottom:12px; font-weight:600;">Items</h4>
    ${items.map(item => `
      <div class="order-item-row">
        <img src="${item.Image_URL || 'https://via.placeholder.com/50'}" class="order-item-img"
             onerror="this.src='https://via.placeholder.com/50'">
        <div style="flex:1;">
          <div style="font-weight:600; font-size:14px;">${item.Product_Name}</div>
          <div style="font-size:12px; color:var(--text-muted);">Qty: ${item.Quantity} × ${formatCurrency(item.Price)}</div>
          ${item.Discount_Applied > 0 ? `<span style="font-size:11px; color:var(--accent-warning);">${item.Discount_Applied}% expiry discount applied</span>` : ''}
        </div>
        <div style="font-weight:600;">${formatCurrency(item.Price * item.Quantity)}</div>
      </div>
    `).join('')}
    <div style="margin-top:16px; padding-top:16px; border-top:2px solid var(--border); text-align:right;">
      <span style="font-size:var(--font-xl); font-weight:800; color:var(--accent);">${formatCurrency(order.Total_Amount)}</span>
    </div>
    ${payment ? `
      <div style="margin-top:16px; padding:12px; background:var(--bg-secondary); border-radius:var(--radius-md);">
        <h4 style="margin-bottom:8px; font-size:14px; font-weight:600;">💳 Payment Info</h4>
        <div style="font-size:13px; color:var(--text-secondary);">
          <div>Payment ID: ${payment.Payment_ID}</div>
          <div>Mode: ${payment.Payment_Mode}</div>
          <div>Status: <span style="color:${payment.Payment_Status === 'Completed' ? 'var(--accent-success)' : 'var(--accent-danger)'};">${payment.Payment_Status}</span></div>
          <div>Date: ${formatDateTime(payment.Payment_Date)}</div>
        </div>
      </div>
    ` : `
      <div style="margin-top:16px; text-align:center;">
        <p style="color:var(--accent-warning); margin-bottom:12px;">⚠️ Payment pending</p>
      </div>
    `}
  `;
}

function closeOrderModal() {
  document.getElementById('orderDetailModal').classList.remove('active');
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});
