/* ========== MODAL MANAGER ==========
   Gerencia dois modais reutilizáveis:
     - open(title, defaultValue) → Promise<string|null>  (prompt/input)
     - confirm(title, message)   → Promise<boolean>       (confirmação destrutiva)
   =================================== */

const ModalManager = (() => {
  let _resolve = null;

  // ── Prompt modal (com input de texto) ─────────────────────────────
  const open = (title, defaultValue = '') => {
    return new Promise((resolve) => {
      _resolve = resolve;
      document.getElementById('modal-title').textContent = title;
      const input = document.getElementById('modal-input');
      input.value = defaultValue;
      document.getElementById('modal-overlay').classList.add('open');
      setTimeout(() => { input.focus(); input.select(); }, 100);
    });
  };

  const close = (value) => {
    document.getElementById('modal-overlay').classList.remove('open');
    if (_resolve) { _resolve(value); _resolve = null; }
  };

  // ── Confirm modal (sem input — apenas confirmação de ação destrutiva) ──
  let _confirmResolve = null;

  const confirm = (title, message = '') => {
    return new Promise((resolve) => {
      _confirmResolve = resolve;
      document.getElementById('confirm-title').textContent = title;
      document.getElementById('confirm-message').textContent = message;
      document.getElementById('confirm-overlay').classList.add('open');
    });
  };

  const _closeConfirm = (result) => {
    document.getElementById('confirm-overlay').classList.remove('open');
    if (_confirmResolve) { _confirmResolve(result); _confirmResolve = null; }
  };

  // ── Inicialização ──────────────────────────────────────────────────
  const init = () => {
    // Prompt modal
    document.getElementById('modal-confirm').addEventListener('click', () => {
      close(document.getElementById('modal-input').value.trim());
    });
    document.getElementById('modal-cancel').addEventListener('click', () => close(null));
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('modal-overlay')) close(null);
    });
    document.getElementById('modal-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') close(document.getElementById('modal-input').value.trim());
      if (e.key === 'Escape') close(null);
    });

    // Confirm modal
    document.getElementById('confirm-ok').addEventListener('click', () => _closeConfirm(true));
    document.getElementById('confirm-cancel').addEventListener('click', () => _closeConfirm(false));
    document.getElementById('confirm-overlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('confirm-overlay')) _closeConfirm(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.getElementById('confirm-overlay').classList.contains('open')) {
        _closeConfirm(false);
      }
    });
  };

  return { open, close, confirm, init };
})();
