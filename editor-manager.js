/* ========== EDITOR MANAGER ==========
   Inicializa e gerencia a instância do CodeMirror.
   Inclui autosave com debounce e pinch-to-zoom (Math.hypot).
   ==================================== */

const EditorManager = (() => {
  let _cm = null;
  let _pinchActive = false;
  let _initialDistance = 0;
  let _initialFontSize = 0;

  const _updateStatus = () => {
    if (!_cm) return;
    const cursor = _cm.getCursor();
    const sel = _cm.getSelection();
    const content = _cm.getValue();
    document.getElementById('status-line').textContent = cursor.line + 1;
    document.getElementById('status-col').textContent = cursor.ch + 1;
    document.getElementById('status-sel').textContent = sel.length;
    const bytes = new Blob([content]).size;
    const size = bytes < 1024 ? bytes + ' B'
      : bytes < 1048576 ? (bytes / 1024).toFixed(1) + ' KB'
      : (bytes / 1048576).toFixed(2) + ' MB';
    document.getElementById('status-size').textContent = size;
  };

  const _setFontSize = (size) => {
    if (!_cm) return;
    const editorElement = _cm.getWrapperElement();
    editorElement.style.fontSize = `${size}px`;
    _cm.refresh();
  };

  const _getCurrentFontSize = () => {
    if (!_cm) return 14;
    const editorElement = _cm.getWrapperElement();
    const computed = getComputedStyle(editorElement).fontSize;
    return parseFloat(computed) || 14;
  };

  const init = (initialContent) => {
    const textarea = document.getElementById('cm-editor');
    const theme = ThemeManager.current() === 'dark' ? 'one-dark' : 'default';

    if (initialContent !== null && initialContent !== undefined) {
      textarea.value = initialContent;
    }

    _cm = CodeMirror.fromTextArea(textarea, {
      mode: LangManager.current(),
      theme: theme,
      lineNumbers: true,
      lineWrapping: false,
      indentUnit: AppConfig.INDENT_SIZE,
      tabSize: AppConfig.INDENT_SIZE,
      indentWithTabs: false,
      smartIndent: true,
      electricChars: true,
      autoCloseBrackets: true,
      autoCloseTags: true,
      matchBrackets: true,
      styleActiveLine: true,
      foldGutter: true,
      gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
      extraKeys: {
        'Tab': (cm) => {
          if (cm.somethingSelected()) {
            cm.indentSelection('add');
          } else {
            cm.replaceSelection(' '.repeat(AppConfig.INDENT_SIZE), 'end');
          }
        },
        'Shift-Tab': (cm) => cm.indentSelection('subtract'),
        'Ctrl-Z': (cm) => cm.undo(),
        'Ctrl-Y': (cm) => cm.redo(),
        'Cmd-Z':  (cm) => cm.undo(),
        'Cmd-Shift-Z': (cm) => cm.redo(),
        'Ctrl-S': () => FileManager.exportFile(),
        'Cmd-S':  () => FileManager.exportFile(),
        'Ctrl-H': () => FindReplaceManager.toggle(),
        'Cmd-H':  () => FindReplaceManager.toggle(),
        'Ctrl-O': () => FileManager.importFile(),
        'Cmd-O':  () => FileManager.importFile(),
        'Escape': () => FindReplaceManager.close(),
      },
      viewportMargin: Infinity,
      scrollbarStyle: 'native',
      inputStyle: 'textarea',
    });

    window._cmEditor = _cm;
    _cm.setSize(null, '100%');
    _cm.on('cursorActivity', _updateStatus);

    // Autosave com debounce
    let _saveTimer = null;
    const AUTOSAVE_DELAY_MS = 600;

    _cm.on('change', () => {
      FileManager.setDirty(true);
      clearTimeout(_saveTimer);
      _saveTimer = setTimeout(() => {
        StorageManager.set(AppConfig.IDB_KEYS.CONTENT, _cm.getValue());
      }, AUTOSAVE_DELAY_MS);
    });

    _updateStatus();

    // --- Pinch-to-zoom (mobile) usando Math.hypot ---
    const editorElement = _cm.getWrapperElement();
    let touchCache = null;

    const getDistance = (t1, t2) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.hypot(dx, dy);
    };

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        _pinchActive = true;
        touchCache = { t1: e.touches[0], t2: e.touches[1] };
        _initialDistance = getDistance(touchCache.t1, touchCache.t2);
        _initialFontSize = _getCurrentFontSize();
      }
    };

    const onTouchMove = (e) => {
      if (_pinchActive && e.touches.length === 2) {
        e.preventDefault();
        const newDist = getDistance(e.touches[0], e.touches[1]);
        const scale = newDist / _initialDistance;
        let newSize = _initialFontSize * scale;
        newSize = Math.min(Math.max(newSize, 12), 32);
        _setFontSize(newSize);
      }
    };

    const onTouchEnd = () => {
      _pinchActive = false;
      touchCache = null;
    };

    editorElement.addEventListener('touchstart', onTouchStart, { passive: false });
    editorElement.addEventListener('touchmove', onTouchMove, { passive: false });
    editorElement.addEventListener('touchend', onTouchEnd);
    editorElement.addEventListener('touchcancel', onTouchEnd);
  };

  const getValue = () => _cm ? _cm.getValue() : '';
  const setValue = (v) => { if (_cm) { _cm.setValue(v); _cm.clearHistory(); } };
  const getSelection = () => _cm ? _cm.getSelection() : '';
  const focus = () => _cm && _cm.focus();
  const getCM = () => _cm;

  return { init, getValue, setValue, getSelection, focus, getCM };
})();