/**
 * profile.js — Profile page: user details, order stats, order history, edit profile
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  loadProfile();

  const editForm = document.getElementById('editProfileForm');
  if (editForm) editForm.addEventListener('submit', handleEditProfile);
});

async function loadProfile() {
  // Fetch profile
  const { ok, data } = await apiGet('/api/auth/profile');
  if (!ok || !data.user) {
    showToast('Failed to load profile.', 'error');
    return;
  }
  const user = data.user;

  // Render profile card
  const initials = (user.Name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('profileCard').innerHTML = `
    <div class="profile-avatar">${initials}</div>
    <div class="profile-name">${user.Name}</div>
    <div class="profile-email">${user.Email}</div>
    <div class="profile-info-list">
      <div class="profile-info-item">
        <span class="profile-info-label">📱 Phone</span>
        <span class="profile-info-value">${user.Mobile_No || 'Not set'}</span>
      </div>
      <div class="profile-info-item">
        <span class="profile-info-label">📍 Address</span>
        <span class="profile-info-value">${user.Address || 'Not set'}</span>
      </div>
      <div class="profile-info-item">
        <span class="profile-info-label">📅 Joined</span>
        <span class="profile-info-value">${formatDate(user.Created_At)}</span>
      </div>
      <div class="profile-info-item">
        <span class="profile-info-label">👤 Role</span>
        <span class="profile-info-value" style="text-transform:capitalize;">${user.role}</span>
      </div>
    </div>
    <button class="profile-edit-btn" onclick="openEditModal()">✏️ Edit Profile</button>
  `;

  // Store for edit modal
  window._profileUser = user;

  // Fetch orders
  const { ok: ordersOk, data: ordersData } = await apiGet('/api/orders');
  const orders = (ordersOk && ordersData.orders) ? ordersData.orders : [];

  // Stats
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, o) => sum + (o.Total_Amount || 0), 0);
  const confirmedOrders = orders.filter(o => o.Order_Status === 'Confirmed' || o.Order_Status === 'Delivered').length;

  document.getElementById('profileStats').innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${totalOrders}</div>
      <div class="stat-label">Total Orders</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${formatCurrency(totalSpent)}</div>
      <div class="stat-label">Total Spent</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${confirmedOrders}</div>
      <div class="stat-label">Completed</div>
    </div>
  `;

  // Orders list
  if (orders.length === 0) {
    document.getElementById('profileOrders').innerHTML = `
      <h3>📦 Order History</h3>
      <div style="text-align:center; padding:32px; color:var(--text-muted);">
        <div style="font-size:48px; margin-bottom:12px;">🛍️</div>
        <p>You haven't placed any orders yet.</p>
        <a href="/products" class="btn btn-primary btn-sm" style="margin-top:12px;">Start Shopping</a>
      </div>
    `;
  } else {
    document.getElementById('profileOrders').innerHTML = `
      <h3>📦 Order History (${orders.length})</h3>
      ${orders.map(order => `
        <div class="profile-order-row" onclick="window.location.href='/orders'">
          <div>
            <div class="profile-order-id">${order.Order_ID}</div>
            <div class="profile-order-date">${formatDateTime(order.Order_Date)}</div>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <div class="order-status ${getStatusClass(order.Order_Status)}">${order.Order_Status}</div>
            <div class="profile-order-amount">${formatCurrency(order.Total_Amount)}</div>
          </div>
        </div>
      `).join('')}
    `;
  }
}

function openEditModal() {
  const user = window._profileUser;
  if (user) {
    document.getElementById('editName').value = user.Name || '';
    document.getElementById('editMobile').value = user.Mobile_No || '';
    document.getElementById('editAddress').value = user.Address || '';
  }
  document.getElementById('editProfileModal').classList.add('active');
}

function closeEditModal() {
  document.getElementById('editProfileModal').classList.remove('active');
}

async function handleEditProfile(e) {
  e.preventDefault();
  const btn = document.getElementById('saveProfileBtn');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  const name = document.getElementById('editName').value.trim();
  const mobile = document.getElementById('editMobile').value.trim();
  const address = document.getElementById('editAddress').value.trim();

  if (!name) {
    showToast('Name is required.', 'error');
    btn.disabled = false;
    btn.textContent = '💾 Save Changes';
    return;
  }

  const { ok, data } = await apiPut('/api/auth/profile', { name, mobile, address });

  if (ok && data.success) {
    showToast('Profile updated successfully! ✅', 'success');
    // Update local storage user name
    const localUser = getUser();
    if (localUser) {
      localUser.name = name;
      localStorage.setItem('ecom_user', JSON.stringify(localUser));
    }
    closeEditModal();
    loadProfile();
    renderHeader(); // Re-render header with updated name
  } else {
    showToast(data.message || 'Failed to update profile.', 'error');
  }

  btn.disabled = false;
  btn.textContent = '💾 Save Changes';
}
