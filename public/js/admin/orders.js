/**
 * admin/orders.js — Order management: view, status update
 */
document.addEventListener('DOMContentLoaded', () => {
  if (!requireAdmin()) return;
  loadOrders();
});

async function loadOrders() {
  const container = document.getElementById('ordersTable');
  const status = document.getElementById('statusFilter').value;

  const params = status !== 'all' ? `?status=${status}` : '';
  const { ok, data } = await apiGet(`/api/admin/orders${params}`);

  if (!ok || !data.orders || data.orders.length === 0) {
    container.innerHTML = '<div class="empty-state"><h3>No orders found</h3></div>';
    return;
  }

  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Order ID</th>
          <th>Customer</th>
          <th>Date</th>
          <th>Items</th>
          <th>Amount</th>
          <th>Payment</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${data.orders.map(o => `
          <tr>
            <td style="font-weight:600; font-size:12px;">${o.Order_ID}</td>
            <td>
              <div style="font-weight:600;">${o.Customer_Name}</div>
              <div style="font-size:11px; color:var(--text-muted);">${o.Customer_Email}</div>
            </td>
            <td style="font-size:13px;">${formatDateTime(o.Order_Date)}</td>
            <td>${o.Item_Count}</td>
            <td style="font-weight:600; color:var(--accent);">${formatCurrency(o.Total_Amount)}</td>
            <td>
              <span style="color:${o.Payment_Status === 'Completed' ? 'var(--accent-success)' : 'var(--accent-warning)'}; font-size:13px;">
                ${o.Payment_Status || 'Unpaid'}
              </span>
            </td>
            <td><span class="order-status ${getStatusClass(o.Order_Status)}">${o.Order_Status}</span></td>
            <td>
              <div style="display:flex; gap:6px;">
                <button class="btn btn-ghost btn-sm" onclick="viewOrder('${o.Order_ID}')">👁️</button>
                <select class="filter-select" style="padding:6px 10px; font-size:11px;" onchange="updateStatus('${o.Order_ID}', this.value)">
                  <option value="">Update</option>
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function viewOrder(orderId) {
  document.getElementById('orderModalTitle').textContent = `Order: ${orderId}`;
  document.getElementById('orderModalContent').innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
  document.getElementById('orderModal').classList.add('active');

  const { ok, data } = await apiGet(`/api/admin/orders/${orderId}`);
  if (!ok) {
    document.getElementById('orderModalContent').innerHTML = '<p class="text-danger">Failed to load.</p>';
    return;
  }

  const o = data.order;
  const items = data.items;
  const payment = data.payment;

  document.getElementById('orderModalContent').innerHTML = `
    <div class="flex-between mb-md">
      <span class="order-status ${getStatusClass(o.Order_Status)}">${o.Order_Status}</span>
      <span style="font-size:13px; color:var(--text-muted);">${formatDateTime(o.Order_Date)}</span>
    </div>
    <div style="padding:12px; background:var(--bg-secondary); border-radius:var(--radius-md); margin-bottom:16px;">
      <div style="font-size:14px; font-weight:600;">👤 ${o.Customer_Name}</div>
      <div style="font-size:12px; color:var(--text-muted);">📧 ${o.Customer_Email} | 📱 ${o.Customer_Mobile || 'N/A'}</div>
      ${o.Shipping_Address ? `<div style="font-size:12px; color:var(--text-muted); margin-top:4px;">📍 ${o.Shipping_Address}</div>` : ''}
    </div>
    <h4 style="margin-bottom:8px;">Items</h4>
    ${items.map(item => `
      <div class="order-item-row">
        <img src="${item.Image_URL || 'https://via.placeholder.com/40'}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;">
        <div style="flex:1;">
          <div style="font-weight:600; font-size:13px;">${item.Product_Name}</div>
          <div style="font-size:11px; color:var(--text-muted);">Qty: ${item.Quantity} × ${formatCurrency(item.Price)}</div>
        </div>
        <div style="font-weight:600;">${formatCurrency(item.Price * item.Quantity)}</div>
      </div>
    `).join('')}
    <div style="text-align:right; margin-top:12px; padding-top:12px; border-top:2px solid var(--border);">
      <span style="font-size:var(--font-xl); font-weight:800; color:var(--accent);">${formatCurrency(o.Total_Amount)}</span>
    </div>
    ${payment ? `
      <div style="margin-top:12px; padding:12px; background:var(--bg-secondary); border-radius:var(--radius-md); font-size:12px; color:var(--text-secondary);">
        💳 ${payment.Payment_Mode} | ${payment.Payment_Status} | ${formatDateTime(payment.Payment_Date)}
      </div>
    ` : ''}
  `;
}

async function updateStatus(orderId, status) {
  if (!status) return;
  if (status === 'Cancelled' && !confirm('Cancel this order? Stock will be restored.')) return;

  const { ok, data } = await apiPut(`/api/admin/orders/${orderId}/status`, { status });
  if (ok) {
    showToast(`Order status updated to ${status}.`, 'success');
    loadOrders();
  } else {
    showToast(data.message || 'Failed to update status.', 'error');
  }
}

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('active');
});
