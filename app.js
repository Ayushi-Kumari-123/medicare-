import { handleRoute } from './router.js';
import { Auth } from './auth.js';

// Toast Notification Manager
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button style="background:none; border:none; color:inherit; font-size:1.1rem; cursor:pointer; margin-left:0.75rem;">&times;</button>
  `;

  const closeBtn = toast.querySelector('button');
  const removeToast = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.2s ease';
    setTimeout(() => toast.remove(), 200);
  };

  closeBtn.addEventListener('click', removeToast);
  setTimeout(removeToast, duration);
  container.appendChild(toast);
}

// Global Event Listeners
window.addEventListener('toast:show', (e) => {
  const { message, type, duration } = e.detail || {};
  showToast(message, type, duration);
});

window.addEventListener('auth:change', () => {
  handleRoute();
});

window.addEventListener('hashchange', () => {
  handleRoute();
});

// App Initialization
document.addEventListener('DOMContentLoaded', async () => {
  await Auth.waitForReady();
  handleRoute();
});
