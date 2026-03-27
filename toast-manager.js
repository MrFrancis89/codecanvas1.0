/* ========== TOAST MANAGER ==========
   Exibe notificações não-invasivas (toasts) na tela.
   =================================== */

const ToastManager = (() => {
  const _container = () => document.getElementById('toast-container');

  const show = (msg, type = 'info', duration = 2800) => {
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${msg}</span>`;
    _container().appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 300);
    }, duration);
  };

  return { show };
})();
