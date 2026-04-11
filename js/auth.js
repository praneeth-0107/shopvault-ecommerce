/**
 * auth.js — Login, Registration, and Forgot Password handling
 */

// Store verified user details for reset step
let verifiedForgotUser = { name: '', email: '' };

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
  const resetPasswordForm = document.getElementById('resetPasswordForm');

  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }

  if (forgotVerifyForm) {
    forgotVerifyForm.addEventListener('submit', handleForgotVerify);
  }

  if (resetPasswordForm) {
    resetPasswordForm.addEventListener('submit', handleResetPassword);
  }
});

// ==========================================
// VIEW TOGGLING
// ==========================================
function showForgotPasswordView() {
  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('forgotStep1').classList.remove('hidden');
  if (document.getElementById('forgotStep2')) {
    document.getElementById('forgotStep2').classList.add('hidden');
  }
}

function showLoginView() {
  document.getElementById('loginView').classList.remove('hidden');
  if (document.getElementById('forgotStep1')) {
    document.getElementById('forgotStep1').classList.add('hidden');
  }
  if (document.getElementById('forgotStep2')) {
    document.getElementById('forgotStep2').classList.add('hidden');
  }
}

function showResetView() {
  document.getElementById('forgotStep1').classList.add('hidden');
  document.getElementById('forgotStep2').classList.remove('hidden');
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
// FORGOT PASSWORD — STEP 1: VERIFY
// ==========================================
async function handleForgotVerify(e) {
  e.preventDefault();
  const btn = document.getElementById('verifyBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span> Verifying...';

  const name = document.getElementById('forgotName').value.trim();
  const email = document.getElementById('forgotEmail').value.trim();

  const { ok, data } = await apiPost('/api/auth/verify-forgot-password', { name, email });

  if (ok && data.success) {
    verifiedForgotUser = { name, email };
    showToast('✅ Identity verified! Set your new password.', 'success');
    showResetView();
  } else {
    showToast(data.message || 'Verification failed. Please check your details.', 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '🔍 Verify Identity';
}

// ==========================================
// FORGOT PASSWORD — STEP 2: RESET
// ==========================================
async function handleResetPassword(e) {
  e.preventDefault();
  const btn = document.getElementById('resetBtn');

  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (newPassword !== confirmPassword) {
    showToast('Passwords do not match!', 'error');
    return;
  }

  if (newPassword.length < 6) {
    showToast('Password must be at least 6 characters.', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span> Resetting...';

  const { ok, data } = await apiPost('/api/auth/reset-password', {
    name: verifiedForgotUser.name,
    email: verifiedForgotUser.email,
    newPassword
  });

  if (ok && data.success) {
    showToast('🎉 Password reset successfully! Redirecting to login...', 'success');
    setTimeout(() => {
      showLoginView();
      // Pre-fill email for convenience
      const emailInput = document.getElementById('email');
      if (emailInput) emailInput.value = verifiedForgotUser.email;
    }, 1500);
  } else {
    showToast(data.message || 'Password reset failed.', 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '🔑 Reset Password';
}
