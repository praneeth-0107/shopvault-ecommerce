/**
 * admin/products.js — Product CRUD (add, edit, delete, list with expiry info)
 */
document.addEventListener('DOMContentLoaded', () => {
  if (!requireAdmin()) return;
  loadProducts();
  document.getElementById('productForm').addEventListener('submit', saveProduct);
});

async function loadProducts() {
  const container = document.getElementById('productsTable');

  const { ok, data } = await apiGet('/api/admin/products');

  if (!ok || !data.products || data.products.length === 0) {
    container.innerHTML = '<div class="empty-state"><h3>No products found</h3><p>Click "Add Product" to add your first product.</p></div>';
    return;
  }

  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Product</th>
          <th>Category</th>
          <th>Price</th>
          <th>Stock</th>
          <th>Expiry</th>
          <th>Auto Discount</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${data.products.map(p => {
          const statusColor = p.Is_Expired ? 'var(--accent-danger)' : p.Auto_Discount > 0 ? 'var(--accent-warning)' : 'var(--accent-success)';
          return `
            <tr>
              <td>
                <div style="display:flex; align-items:center; gap:12px;">
                  <img src="${p.Image_URL || 'https://via.placeholder.com/40'}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;"
                       onerror="this.src='https://via.placeholder.com/40'">
                  <div>
                    <div style="font-weight:600; color:var(--text-primary);">${p.Product_Name}</div>
                    <div style="font-size:11px; color:var(--text-muted);">${p.Product_ID}</div>
                  </div>
                </div>
              </td>
              <td>${p.Category || '-'}</td>
              <td>
                ${p.Auto_Discount > 0 ? `<span style="text-decoration:line-through; color:var(--text-muted);">${formatCurrency(p.Original_Price)}</span><br>` : ''}
                <span style="font-weight:600; color:var(--accent);">${formatCurrency(p.Effective_Price || p.Price)}</span>
              </td>
              <td>
                <span style="color:${p.Quantity <= 10 ? 'var(--accent-danger)' : 'var(--text-primary)'}; font-weight:600;">
                  ${p.Quantity}
                </span>
              </td>
              <td>${p.Expiry_Date ? formatDate(p.Expiry_Date) : 'N/A'}</td>
              <td>
                <span style="color:${statusColor}; font-weight:600;">
                  ${p.Is_Expired ? '❌ Expired' : p.Auto_Discount > 0 ? `${p.Auto_Discount}% OFF` : '✅ Fresh'}
                </span>
                ${p.Remaining_Days !== null && !p.Is_Expired ? `<br><span style="font-size:11px; color:var(--text-muted);">${p.Remaining_Days}d left</span>` : ''}
              </td>
              <td>
                <div style="display:flex; gap:6px;">
                  <button class="btn btn-ghost btn-sm" onclick="editProduct('${p.Product_ID}')">✏️</button>
                  <button class="btn btn-ghost btn-sm" onclick="deleteProduct('${p.Product_ID}', '${p.Product_Name.replace(/'/g, "\\'")}')">🗑️</button>
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function openAddModal() {
  document.getElementById('modalTitle').textContent = 'Add New Product';
  document.getElementById('productForm').reset();
  document.getElementById('editProductId').value = '';
  document.getElementById('productModal').classList.add('active');
}

async function editProduct(productId) {
  const { ok, data } = await apiGet(`/api/products/${productId}`);
  if (!ok) return showToast('Failed to load product.', 'error');

  const p = data.product;
  document.getElementById('modalTitle').textContent = 'Edit Product';
  document.getElementById('editProductId').value = p.Product_ID;
  document.getElementById('pName').value = p.Product_Name;
  document.getElementById('pCategory').value = p.Category || '';
  document.getElementById('pPrice').value = p.Price;
  document.getElementById('pQuantity').value = p.Quantity;
  document.getElementById('pExpiry').value = p.Expiry_Date ? p.Expiry_Date.split('T')[0] : '';
  document.getElementById('pImage').value = p.Image_URL || '';
  document.getElementById('pDescription').value = p.Description || '';
  document.getElementById('productModal').classList.add('active');
}

async function saveProduct(e) {
  e.preventDefault();
  const editId = document.getElementById('editProductId').value;
  const btn = document.getElementById('saveBtn');
  btn.disabled = true;

  const payload = {
    productName: document.getElementById('pName').value.trim(),
    category: document.getElementById('pCategory').value.trim(),
    price: document.getElementById('pPrice').value,
    quantity: document.getElementById('pQuantity').value,
    expiryDate: document.getElementById('pExpiry').value || null,
    imageUrl: document.getElementById('pImage').value.trim() || null,
    description: document.getElementById('pDescription').value.trim() || null
  };

  let result;
  if (editId) {
    result = await apiPut(`/api/admin/products/${editId}`, payload);
  } else {
    result = await apiPost('/api/admin/products', payload);
  }

  if (result.ok) {
    showToast(editId ? 'Product updated!' : 'Product added!', 'success');
    closeModal();
    loadProducts();
  } else {
    showToast(result.data.message || 'Failed to save product.', 'error');
  }

  btn.disabled = false;
}

async function deleteProduct(productId, productName) {
  if (!confirm(`Delete "${productName}"? This action cannot be undone.`)) return;

  const { ok, data } = await apiDelete(`/api/admin/products/${productId}`);
  if (ok) {
    showToast('Product deleted.', 'success');
    loadProducts();
  } else {
    showToast(data.message || 'Failed to delete product.', 'error');
  }
}

function closeModal() {
  document.getElementById('productModal').classList.remove('active');
}

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});
