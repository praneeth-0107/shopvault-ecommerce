/**
 * admin/dashboard.js — Admin dashboard with summary statistics
 */
document.addEventListener('DOMContentLoaded', () => {
  if (!requireAdmin()) return;
  const user = getUser();
  document.getElementById('adminGreeting').textContent = `Welcome, ${user.name}`;
  loadDashboard();
});

async function loadDashboard() {
  const { ok, data } = await apiGet('/api/admin/dashboard');

  if (!ok) {
    document.getElementById('statsGrid').innerHTML = '<p class="text-danger">Failed to load dashboard data.</p>';
    return;
  }

  const s = data.summary;

  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon purple">📦</div>
      <div class="stat-value">${s.totalProducts}</div>
      <div class="stat-label">Total Products</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon blue">👥</div>
      <div class="stat-value">${s.totalCustomers}</div>
      <div class="stat-label">Registered Customers</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon green">🛍️</div>
      <div class="stat-value">${s.totalOrders}</div>
      <div class="stat-label">Total Orders</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon pink">💰</div>
      <div class="stat-value">${formatCurrency(s.totalRevenue)}</div>
      <div class="stat-label">Total Revenue</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon orange">⏳</div>
      <div class="stat-value">${s.pendingOrders}</div>
      <div class="stat-label">Pending Orders</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon red">📉</div>
      <div class="stat-value">${s.lowStock}</div>
      <div class="stat-label">Low Stock Items</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon orange">⚠️</div>
      <div class="stat-value">${s.expiringProducts}</div>
      <div class="stat-label">Expiring Soon (≤15 days)</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon red">❌</div>
      <div class="stat-value">${s.expiredProducts}</div>
      <div class="stat-label">Expired Products</div>
    </div>
  `;

  // Quick links
  document.getElementById('dashboardExtra').innerHTML = `
    <div class="card">
      <div class="card-body">
        <h3 class="card-title">Quick Actions</h3>
        <div style="display:flex; flex-direction:column; gap:8px; margin-top:16px;">
          <a href="/admin/products" class="btn btn-secondary btn-sm">📦 Manage Products</a>
          <a href="/admin/orders" class="btn btn-secondary btn-sm">🛍️ Manage Orders</a>
          <a href="/admin/customers" class="btn btn-secondary btn-sm">👥 View Customers</a>
          <a href="/admin/reports" class="btn btn-secondary btn-sm">📈 View Reports</a>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-body">
        <h3 class="card-title">Auto Expiry Discount</h3>
        <p class="card-text" style="margin-top:12px;">Products near expiry automatically receive discounts:</p>
        <div style="font-size:13px; color:var(--text-secondary); line-height:2;">
          <div>≤15 & &gt;10 days → <strong style="color:var(--accent-warning)">50% OFF</strong></div>
          <div>≤10 & &gt;5 days → <strong style="color:var(--accent-warm)">70% OFF</strong></div>
          <div>≤5 & &gt;2 days → <strong style="color:var(--accent-danger)">80% OFF</strong></div>
          <div>2 days → <strong style="color:var(--accent-danger)">85% OFF</strong></div>
          <div>1 day → <strong style="color:var(--accent-danger)">90% OFF</strong></div>
        </div>
      </div>
    </div>
  `;
}
