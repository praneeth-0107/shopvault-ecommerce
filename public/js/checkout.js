/**
 * checkout.js — Checkout flow using Razorpay Payment Gateway
 * Supports: UPI, Cards, Net Banking, Wallets — all handled by Razorpay
 * Includes: Google Maps embed, geolocation auto-detect, mandatory address
 */
let cartData = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  loadCheckout();

  // Update the map whenever the user changes address fields (debounced)
  let mapUpdateTimer = null;
  ['addressStreet', 'addressCity', 'addressState', 'addressPincode'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        clearTimeout(mapUpdateTimer);
        mapUpdateTimer = setTimeout(() => updateMapFromFields(), 1200);
      });
    }
  });
});

// ==========================================
// ADDRESS HELPERS
// ==========================================

/** Build full address string from individual fields */
function buildFullAddress() {
  const street = (document.getElementById('addressStreet')?.value || '').trim();
  const city = (document.getElementById('addressCity')?.value || '').trim();
  const state = (document.getElementById('addressState')?.value || '').trim();
  const pincode = (document.getElementById('addressPincode')?.value || '').trim();
  const landmark = (document.getElementById('addressLandmark')?.value || '').trim();

  const parts = [street, landmark, city, state, pincode].filter(Boolean);
  return parts.join(', ');
}

/** Validate mandatory address fields — returns true if valid */
function validateAddress() {
  const street = (document.getElementById('addressStreet')?.value || '').trim();
  const city = (document.getElementById('addressCity')?.value || '').trim();
  const state = (document.getElementById('addressState')?.value || '').trim();
  const pincode = (document.getElementById('addressPincode')?.value || '').trim();

  if (!street) { showToast('Please enter your street / house / flat number.', 'error'); document.getElementById('addressStreet').focus(); return false; }
  if (!city) { showToast('Please enter your city.', 'error'); document.getElementById('addressCity').focus(); return false; }
  if (!state) { showToast('Please enter your state.', 'error'); document.getElementById('addressState').focus(); return false; }
  if (!pincode || pincode.length < 5) { showToast('Please enter a valid pincode.', 'error'); document.getElementById('addressPincode').focus(); return false; }
  return true;
}

/** Update the Google Maps embed iframe from current field values */
function updateMapFromFields() {
  const address = buildFullAddress();
  if (address.length > 5) {
    showMapForAddress(address);
  }
}

/** Show a Google Maps embed for a given address string (no API key needed) */
function showMapForAddress(address) {
  const container = document.getElementById('mapContainer');
  if (!container) return;
  const q = encodeURIComponent(address);
  container.innerHTML = `<iframe
    src="https://www.google.com/maps?q=${q}&output=embed"
    allowfullscreen loading="lazy"
    referrerpolicy="no-referrer-when-downgrade"
    style="width:100%;height:100%;border:0;border-radius:var(--radius-md);"
  ></iframe>`;
}

/** Show map for lat/lng coordinates */
function showMapForCoords(lat, lng) {
  const container = document.getElementById('mapContainer');
  if (!container) return;
  container.innerHTML = `<iframe
    src="https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed"
    allowfullscreen loading="lazy"
    referrerpolicy="no-referrer-when-downgrade"
    style="width:100%;height:100%;border:0;border-radius:var(--radius-md);"
  ></iframe>`;
}

// ==========================================
// GEOLOCATION — "Detect My Location"
// ==========================================
async function locateMe() {
  const btn = document.getElementById('locateMeBtn');
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser.', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<div class="btn-spinner"></div> Detecting…';

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;

      // Show map immediately
      showMapForCoords(latitude, longitude);

      // Reverse-geocode using free Nominatim API
      try {
        const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`, {
          headers: { 'Accept-Language': 'en' }
        });
        const geo = await resp.json();

        if (geo && geo.address) {
          const a = geo.address;
          // Fill fields
          const road = [a.house_number, a.road || a.pedestrian || a.neighbourhood || ''].filter(Boolean).join(' ');
          document.getElementById('addressStreet').value = road || a.suburb || '';
          document.getElementById('addressCity').value = a.city || a.town || a.village || a.county || '';
          document.getElementById('addressState').value = a.state || '';
          document.getElementById('addressPincode').value = a.postcode || '';
          document.getElementById('addressLandmark').value = a.suburb || a.neighbourhood || '';

          showToast('Location detected successfully! 📍', 'success');

          // Update map with full address for better pin
          setTimeout(() => updateMapFromFields(), 500);
        } else {
          showToast('Could not determine address. Please fill manually.', 'warning');
        }
      } catch (err) {
        console.error('Reverse geocoding error:', err);
        showToast('Location detected but address lookup failed. Please fill manually.', 'warning');
      }

      btn.disabled = false;
      btn.innerHTML = '📍 Detect My Location';
    },
    (error) => {
      btn.disabled = false;
      btn.innerHTML = '📍 Detect My Location';
      switch (error.code) {
        case error.PERMISSION_DENIED:
          showToast('Location permission denied. Please allow location access or enter address manually.', 'error');
          break;
        case error.POSITION_UNAVAILABLE:
          showToast('Location unavailable. Please enter address manually.', 'error');
          break;
        default:
          showToast('Could not detect location. Please enter address manually.', 'error');
      }
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
}

// ==========================================
// CHECKOUT LOAD
// ==========================================
async function loadCheckout() {
  const { ok, data } = await apiGet('/api/cart');

  if (!ok || !data.cart || data.cart.length === 0) {
    showToast('Your cart is empty.', 'warning');
    setTimeout(() => window.location.href = '/products', 1000);
    return;
  }

  cartData = data;

  // Render items
  const itemsEl = document.getElementById('checkoutItems');
  itemsEl.innerHTML = data.cart.map(item => {
    const imgSrc = item.Image_URL || 'https://via.placeholder.com/50x50?text=No+Image';
    return `
      <div class="order-item-row">
        <img src="${imgSrc}" class="order-item-img" onerror="this.src='https://via.placeholder.com/50x50?text=Error'">
        <div style="flex:1;">
          <div style="font-weight:600;">${item.Product_Name}</div>
          <div style="font-size:12px; color:var(--text-muted);">Qty: ${item.Cart_Quantity} × ${formatCurrency(item.Effective_Price)}</div>
          ${item.Discount_Label ? `<div style="font-size:11px; color:var(--accent-warning);">${item.Discount_Label}</div>` : ''}
        </div>
        <div style="font-weight:600;">${formatCurrency(item.Item_Total)}</div>
      </div>
    `;
  }).join('');

  // Pre-fill address if available from profile
  const { data: profileData } = await apiGet('/api/auth/profile');
  if (profileData && profileData.user && profileData.user.Address) {
    const addr = profileData.user.Address;
    // Try to fill the street field with the full address (user can adjust)
    document.getElementById('addressStreet').value = addr;
    // Show map for the existing address
    setTimeout(() => showMapForAddress(addr), 500);
  }

  // Render summary
  const s = data.summary;
  document.getElementById('checkoutSummary').innerHTML = `
    <h3>Payment Summary</h3>
    <div class="summary-row">
      <span>Subtotal (${s.itemCount} items)</span>
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

    <div style="margin-top:16px; padding:12px; background:rgba(108,92,231,0.08); border:1px solid rgba(108,92,231,0.2); border-radius:var(--radius-md); text-align:center;">
      <div style="font-size:12px; color:var(--text-muted); margin-bottom:4px;">Powered by Razorpay</div>
      <div style="font-size:11px; color:var(--text-muted);">UPI • Cards • Net Banking • Wallets</div>
    </div>

    <button class="btn btn-accent btn-block btn-lg mt-lg" id="placeOrderBtn" onclick="placeOrder()">
      💳 Place Order & Pay ${formatCurrency(s.total)}
    </button>
    <p style="text-align:center; font-size:11px; color:var(--text-muted); margin-top:12px;">
      🔒 Your payment is secure and encrypted
    </p>
  `;
}

// ==========================================
// PLACE ORDER
// ==========================================
async function placeOrder() {
  // Validate address is filled
  if (!validateAddress()) return;

  const btn = document.getElementById('placeOrderBtn');
  btn.disabled = true;
  btn.textContent = 'Processing...';

  // Build full address from fields
  const shippingAddress = buildFullAddress();
  document.getElementById('shippingAddress').value = shippingAddress;

  // Step 1: Place the order
  const { ok, data } = await apiPost('/api/orders', { shippingAddress });

  if (!ok) {
    showToast(data.message || 'Failed to place order.', 'error');
    btn.disabled = false;
    btn.textContent = '💳 Place Order & Pay';
    return;
  }

  const orderId = data.order.orderId;

  // Step 2: Create Razorpay payment order
  const { ok: payOk, data: payData } = await apiPost('/api/payments/create-order', { orderId });

  if (!payOk) {
    showToast('Order placed but payment initiation failed. You can pay later from Orders page.', 'warning');
    setTimeout(() => window.location.href = '/orders', 2000);
    return;
  }

  // Step 3: Open Razorpay Checkout (handles UPI, Cards, Net Banking, Wallets)
  openRazorpayCheckout(orderId, payData);
}

/**
 * Open Razorpay's official checkout — handles all payment methods
 * including UPI (QR code + intent), Debit/Credit Cards, Net Banking, Wallets
 */
function openRazorpayCheckout(orderId, payData) {
  const user = getUser();

  const options = {
    key: payData.key,
    amount: payData.razorpayOrder.amount,
    currency: payData.razorpayOrder.currency,
    name: 'ShopVault',
    description: `Order #${orderId}`,
    order_id: payData.razorpayOrder.id,
    prefill: {
      name: user ? user.name : '',
      email: user ? user.email : ''
    },
    theme: {
      color: '#6C5CE7'
    },
    handler: async function (response) {
      // Payment successful — verify on server
      showToast('Verifying payment...', 'info');

      const { ok, data } = await apiPost('/api/payments/verify', {
        orderId,
        razorpayOrderId: response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
        paymentMode: 'Razorpay'
      });

      if (ok) {
        showToast('Payment successful! ✅', 'success');
        showInvoice(orderId);
      } else {
        showToast('Payment verification failed. Contact support.', 'error');
        setTimeout(() => window.location.href = '/orders', 2000);
      }
    },
    modal: {
      ondismiss: function () {
        // User closed the payment popup
        showToast('Payment cancelled. Your order is saved — you can pay later from Orders page.', 'warning');
        const btn = document.getElementById('placeOrderBtn');
        if (btn) {
          btn.disabled = false;
          btn.textContent = '💳 Place Order & Pay';
        }
      }
    }
  };

  const rzp = new Razorpay(options);
  rzp.open();
}

// ==========================================
// INVOICE
// ==========================================
async function showInvoice(orderId) {
  const { ok, data } = await apiGet(`/api/orders/${orderId}`);

  if (!ok) {
    setTimeout(() => window.location.href = '/orders', 1000);
    return;
  }

  const order = data.order;
  const items = data.items;
  const payment = data.payment;

  const invoiceContent = document.getElementById('invoiceContent');
  invoiceContent.innerHTML = `
    <div style="text-align:center; margin-bottom:24px;">
      <div style="font-size:48px; margin-bottom:12px;">✅</div>
      <h2 style="color:var(--accent-success); margin-bottom:4px;">Payment Successful!</h2>
      <p style="color:var(--text-muted);">Your order has been confirmed</p>
    </div>
    <div class="invoice-card" style="max-width:100%;">
      <div class="invoice-header">
        <div>
          <h3 style="font-size:18px; font-weight:700;">Invoice</h3>
          <p style="font-size:13px; color:var(--text-muted);">Order: ${order.Order_ID}</p>
          <p style="font-size:13px; color:var(--text-muted);">Date: ${formatDateTime(order.Order_Date)}</p>
        </div>
        <div style="text-align:right;">
          <div class="order-status ${getStatusClass(order.Order_Status)}">${order.Order_Status}</div>
        </div>
      </div>
      ${items.map(item => `
        <div class="invoice-row">
          <span>${item.Product_Name} × ${item.Quantity}</span>
          <span>${formatCurrency(item.Price * item.Quantity)}</span>
        </div>
      `).join('')}
      <div class="invoice-row invoice-total">
        <span>Total Paid</span>
        <span>${formatCurrency(order.Total_Amount)}</span>
      </div>
      ${payment ? `
        <div style="margin-top:16px; padding-top:12px; border-top:1px solid var(--border);">
          <div class="invoice-row" style="font-size:12px;">
            <span style="color:var(--text-muted);">Payment ID</span>
            <span style="color:var(--text-muted);">${payment.Payment_ID}</span>
          </div>
          <div class="invoice-row" style="font-size:12px;">
            <span style="color:var(--text-muted);">Payment Mode</span>
            <span style="color:var(--text-muted);">${payment.Payment_Mode}</span>
          </div>
        </div>
      ` : ''}
    </div>
    <div style="display:flex; gap:12px; justify-content:center; margin-top:24px;">
      <a href="/orders" class="btn btn-primary">View Orders</a>
      <a href="/products" class="btn btn-secondary">Continue Shopping</a>
    </div>
  `;

  document.getElementById('invoiceModal').classList.add('active');
}

