/**
 * admin/reports.js — Sales & order reports with analytics
 */
document.addEventListener('DOMContentLoaded', () => {
  if (!requireAdmin()) return;
  loadReports();
});

async function loadReports() {
  const container = document.getElementById('reportsContent');
  container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;

  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);

  const { ok, data } = await apiGet(`/api/admin/reports/sales?${params}`);

  if (!ok) {
    container.innerHTML = '<p class="text-danger">Failed to load reports.</p>';
    return;
  }

  container.innerHTML = `
    <!-- Order Status Distribution -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:32px;">
      <div class="card">
        <div class="card-body">
          <h3 class="card-title" style="margin-bottom:16px;">📊 Order Status Distribution</h3>
          ${data.statusDistribution && data.statusDistribution.length > 0 ? `
            <div style="display:flex; flex-direction:column; gap:12px;">
              ${data.statusDistribution.map(s => {
                const total = data.statusDistribution.reduce((sum, x) => sum + x.count, 0);
                const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                return `
                  <div>
                    <div class="flex-between" style="margin-bottom:4px;">
                      <span class="order-status ${getStatusClass(s.Order_Status)}">${s.Order_Status}</span>
                      <span style="font-size:13px; font-weight:600;">${s.count} (${pct}%)</span>
                    </div>
                    <div style="height:6px; background:var(--bg-primary); border-radius:3px; overflow:hidden;">
                      <div style="height:100%; width:${pct}%; background:var(--gradient-primary); border-radius:3px; transition:width 0.5s;"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : '<p class="text-muted">No order data available.</p>'}
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <h3 class="card-title" style="margin-bottom:16px;">🏷️ Category-wise Sales</h3>
          ${data.categorySales && data.categorySales.length > 0 ? `
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${data.categorySales.map(c => `
                <div class="flex-between" style="padding:8px 0; border-bottom:1px solid var(--border);">
                  <div>
                    <div style="font-weight:600; font-size:14px;">${c.Category || 'Uncategorized'}</div>
                    <div style="font-size:12px; color:var(--text-muted);">${c.total_sold} units sold</div>
                  </div>
                  <span style="font-weight:700; color:var(--accent);">${formatCurrency(c.total_revenue)}</span>
                </div>
              `).join('')}
            </div>
          ` : '<p class="text-muted">No sales data available.</p>'}
        </div>
      </div>
    </div>

    <!-- Top Products -->
    <div class="card" style="margin-bottom:32px;">
      <div class="card-body">
        <h3 class="card-title" style="margin-bottom:16px;">🏆 Top Selling Products</h3>
        ${data.topProducts && data.topProducts.length > 0 ? `
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>Category</th>
                <th>Units Sold</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${data.topProducts.map((p, i) => `
                <tr>
                  <td style="font-weight:700; color:${i < 3 ? 'var(--accent-warning)' : 'var(--text-muted)'};">${i + 1}</td>
                  <td style="font-weight:600;">${p.Product_Name}</td>
                  <td>${p.Category || '-'}</td>
                  <td style="font-weight:600;">${p.total_sold}</td>
                  <td style="font-weight:600; color:var(--accent);">${formatCurrency(p.total_revenue)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p class="text-muted">No product sales data available yet.</p>'}
      </div>
    </div>

    <!-- Sales Timeline -->
    <div class="card">
      <div class="card-body">
        <h3 class="card-title" style="margin-bottom:16px;">📅 Sales Timeline</h3>
        ${data.salesData && data.salesData.length > 0 ? `
          <table class="data-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Orders</th>
                <th>Revenue</th>
                <th>Avg Order Value</th>
              </tr>
            </thead>
            <tbody>
              ${data.salesData.map(s => `
                <tr>
                  <td style="font-weight:600;">${s.period}</td>
                  <td>${s.order_count}</td>
                  <td style="font-weight:600; color:var(--accent);">${formatCurrency(s.revenue)}</td>
                  <td>${formatCurrency(s.avg_order_value)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p class="text-muted">No sales data for the selected period.</p>'}
      </div>
    </div>
  `;
}
