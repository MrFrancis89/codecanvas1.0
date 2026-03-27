/* ========== LANG MANAGER ==========
   Gerencia a linguagem/modo do CodeMirror e o select de linguagem.
   ================================== */

const LangManager = (() => {
  let _current = AppConfig.DEFAULT_LANG;

  const setMode = (mode) => {
    _current = mode;
    if (window._cmEditor) window._cmEditor.setOption('mode', mode);
    document.getElementById('lang-select').value = mode;
    document.getElementById('status-lang').textContent = AppConfig.MODE_LABELS[mode] || mode;
    StorageManager.set(AppConfig.IDB_KEYS.LANG, mode);
  };

  const current = () => _current;

  const setInitialMode = (mode) => {
    if (!mode) return;
    _current = mode;
    document.getElementById('lang-select').value = mode;
    document.getElementById('status-lang').textContent = AppConfig.MODE_LABELS[mode] || mode;
  };

  const init = () => {
    document.getElementById('lang-select').addEventListener('change', (e) => {
      setMode(e.target.value);
    });
  };

  return { init, setMode, setInitialMode, current };
})();