/**
 * products.js — Product listing with search, filter, sort, pagination
 */
let searchTimeout = null;
let currentPage = 1;

document.addEventListener('DOMContentLoaded', async () => {
  await loadCategories();
  await loadProducts();
});

async function loadCategories() {
  const { ok, data } = await apiGet('/api/products/categories');
  if (ok && data.categories) {
    const select = document.getElementById('categoryFilter');
    data.categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      select.appendChild(option);
    });
  }
}

function debounceSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage = 1;
    loadProducts();
  }, 400);
}

async function loadProducts(page = currentPage) {
  currentPage = page;
  const container = document.getElementById('productsGrid');
  container.innerHTML = '<div class="loading-spinner" style="grid-column:1/-1;"><div class="spinner"></div></div>';

  const search = document.getElementById('searchInput').value.trim();
  const category = document.getElementById('categoryFilter').value;
  const sort = document.getElementById('sortFilter').value;

  const params = new URLSearchParams({ page, limit: 12, sort });
  if (search) params.set('search', search);
  if (category !== 'all') params.set('category', category);

  const { ok, data } = await apiGet(`/api/products?${params}`);

  if (!ok || !data.products || data.products.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="icon">🔍</div>
        <h3>No products found</h3>
        <p>Try adjusting your search or filter criteria.</p>
      </div>
    `;
    document.getElementById('pagination').innerHTML = '';
    return;
  }

  container.innerHTML = data.products.map(p => renderProductCard(p)).join('');
  renderPagination(data.pagination);
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

function renderPagination(pagination) {
  const container = document.getElementById('pagination');
  if (!pagination || pagination.pages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';
  if (pagination.page > 1) {
    html += `<button class="btn btn-ghost btn-sm" onclick="loadProducts(${pagination.page - 1})">← Prev</button>`;
  }

  for (let i = 1; i <= pagination.pages; i++) {
    html += `<button class="btn ${i === pagination.page ? 'btn-primary' : 'btn-ghost'} btn-sm" onclick="loadProducts(${i})">${i}</button>`;
  }

  if (pagination.page < pagination.pages) {
    html += `<button class="btn btn-ghost btn-sm" onclick="loadProducts(${pagination.page + 1})">Next →</button>`;
  }

  container.innerHTML = html;
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
