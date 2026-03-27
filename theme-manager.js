/* ========== THEME MANAGER ==========
   Gerencia tema claro/escuro, respeitando preferência do sistema.
   =================================== */

const ThemeManager = (() => {
  let _current = 'dark';

  const _getSystemTheme = () =>
    window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';

  const _apply = (theme) => {
    _current = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(AppConfig.LS_KEYS.THEME, theme);
    const metaColor = document.getElementById('meta-theme-color');
    metaColor.content = theme === 'dark' ? '#0a0a0f' : '#f5f5f7';
    document.getElementById('icon-theme-dark').style.display  = theme === 'dark'  ? 'block' : 'none';
    document.getElementById('icon-theme-light').style.display = theme === 'light' ? 'block' : 'none';
    if (window._cmEditor) {
      window._cmEditor.setOption('theme', theme === 'dark' ? 'one-dark' : 'default');
      window._cmEditor.refresh();
    }
    // Atualiza highlighting completo se o EditorManager ja estiver pronto
    if (typeof EditorManager !== 'undefined' && EditorManager.refreshHighlight) {
      EditorManager.refreshHighlight();
    }
  };

  const init = () => {
    const saved = localStorage.getItem(AppConfig.LS_KEYS.THEME);
    _apply(saved || _getSystemTheme());
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(AppConfig.LS_KEYS.THEME)) _apply(e.matches ? 'dark' : 'light');
    });
  };

  const toggle = () => _apply(_current === 'dark' ? 'light' : 'dark');
  const current = () => _current;

  return { init, toggle, current };
})();
