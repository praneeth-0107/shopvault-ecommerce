/**
 * admin/customers.js — View all registered customers
 */
document.addEventListener('DOMContentLoaded', () => {
  if (!requireAdmin()) return;
  loadCustomers();
});

async function loadCustomers() {
  const container = document.getElementById('customersTable');

  const { ok, data } = await apiGet('/api/admin/customers');

  if (!ok || !data.customers || data.customers.length === 0) {
    container.innerHTML = '<div class="empty-state"><h3>No customers registered yet</h3></div>';
    return;
  }

  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Customer ID</th>
          <th>Name</th>
          <th>Email</th>
          <th>Mobile</th>
          <th>Address</th>
          <th>Orders</th>
          <th>Total Spent</th>
          <th>Joined</th>
        </tr>
      </thead>
      <tbody>
        ${data.customers.map(c => `
          <tr>
            <td style="font-size:11px; color:var(--text-muted);">${c.Customer_ID}</td>
            <td style="font-weight:600;">${c.Name}</td>
            <td style="font-size:13px;">${c.Email}</td>
            <td style="font-size:13px;">${c.Mobile_No || 'N/A'}</td>
            <td style="font-size:12px; max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.Address || 'N/A'}</td>
            <td style="font-weight:600;">${c.Total_Orders}</td>
            <td style="font-weight:600; color:var(--accent);">${formatCurrency(c.Total_Spent)}</td>
            <td style="font-size:13px;">${formatDate(c.Created_At)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}
