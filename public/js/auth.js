/**
 * auth.js — Login, Registration, and Forgot Password handling
 */

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect
  if (isLoggedIn()) {
    const user = getUser();
    if (user && user.role === 'admin') {
      window.location.href = '/admin';
    } else {
      window.location.href = '/products';
    }
    return;
  }

  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const forgotVerifyForm = document.getElementById('forgotVerifyForm');

  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }

  if (forgotVerifyForm) {
    forgotVerifyForm.addEventListener('submit', handleForgotPassword);
  }
});

// ==========================================
// VIEW TOGGLING
// ==========================================
function showForgotPasswordView() {
  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('forgotStep1').classList.remove('hidden');
  // Reset state
  const form = document.getElementById('forgotVerifyForm');
  const successMsg = document.getElementById('forgotSuccessMessage');
  if (form) form.classList.remove('hidden');
  if (successMsg) successMsg.classList.add('hidden');
}

function showLoginView() {
  document.getElementById('loginView').classList.remove('hidden');
  if (document.getElementById('forgotStep1')) {
    document.getElementById('forgotStep1').classList.add('hidden');
  }
}

// ==========================================
// LOGIN
// ==========================================
async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.textContent = 'Signing in...';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  const { ok, data } = await apiPost('/api/auth/login', { email, password });

  if (ok && data.success) {
    setAuth(data.token, data.user);
    showToast(`Welcome back, ${data.user.name}!`, 'success');
    setTimeout(() => {
      if (data.user.role === 'admin') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/products';
      }
    }, 800);
  } else {
    showToast(data.message || 'Login failed.', 'error');
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

// ==========================================
// REGISTER
// ==========================================
async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('registerBtn');
  btn.disabled = true;
  btn.textContent = 'Creating account...';

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const mobile = document.getElementById('mobile').value.trim();
  const address = document.getElementById('address').value.trim();

  const { ok, data } = await apiPost('/api/auth/register', { name, email, password, mobile, address });

  if (ok && data.success) {
    setAuth(data.token, data.user);
    showToast('Account created successfully! 🎉', 'success');
    setTimeout(() => window.location.href = '/products', 1000);
  } else {
    showToast(data.message || 'Registration failed.', 'error');
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}

// ==========================================
// FORGOT PASSWORD — Send Reset Link via Email
// ==========================================
async function handleForgotPassword(e) {
  e.preventDefault();
  const btn = document.getElementById('verifyBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span> Sending...';

  const email = document.getElementById('forgotEmail').value.trim();

  const { ok, data } = await apiPost('/api/auth/forgot-password', { email });

  if (ok && data.success) {
    // Hide the form and show success message
    document.getElementById('forgotVerifyForm').classList.add('hidden');
    document.getElementById('forgotSuccessMessage').classList.remove('hidden');
    showToast('📧 Reset link sent to your email!', 'success');
  } else {
    showToast(data.message || 'Failed to send reset email. Please try again.', 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '📧 Send Reset Link';
}
