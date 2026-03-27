/* ========== FIND & REPLACE MANAGER ==========
   Painel de Busca e Substituição customizado para mobile.
   Usa a API SearchCursor do CodeMirror internamente.
   =========================================== */

const FindReplaceManager = (() => {
  let _isOpen = false;
  let _lastQuery = '';
  let _matches = [];
  let _currentIdx = -1;

  const _getQuery = () => document.getElementById('find-input').value;
  const _getReplacement = () => document.getElementById('replace-input').value;
  const _info = (msg) => document.getElementById('find-info').textContent = msg;

  const _buildMatches = () => {
    const cm = EditorManager.getCM();
    const query = _getQuery();
    if (!query) { _matches = []; _currentIdx = -1; _info('Pronto para buscar'); return; }
    _matches = [];
    const cursor = cm.getSearchCursor(query, CodeMirror.Pos(0, 0), { caseFold: true });
    while (cursor.findNext()) {
      _matches.push({ from: cursor.from(), to: cursor.to() });
    }
    _info(`${_matches.length} resultado(s) encontrado(s)`);
  };

  const _highlightCurrent = () => {
    const cm = EditorManager.getCM();
    if (_matches.length === 0 || _currentIdx < 0) return;
    const m = _matches[_currentIdx];
    cm.setSelection(m.from, m.to);
    cm.scrollIntoView({ from: m.from, to: m.to }, 80);
    _info(`${_currentIdx + 1} de ${_matches.length}`);
  };

  const findNext = () => {
    const query = _getQuery();
    if (!query) return;
    if (query !== _lastQuery) { _lastQuery = query; _buildMatches(); _currentIdx = -1; }
    if (_matches.length === 0) { _info('Nenhum resultado'); return; }
    _currentIdx = (_currentIdx + 1) % _matches.length;
    _highlightCurrent();
  };

  const findPrev = () => {
    const query = _getQuery();
    if (!query) return;
    if (query !== _lastQuery) { _lastQuery = query; _buildMatches(); _currentIdx = _matches.length; }
    if (_matches.length === 0) { _info('Nenhum resultado'); return; }
    _currentIdx = (_currentIdx - 1 + _matches.length) % _matches.length;
    _highlightCurrent();
  };

  const replaceOne = () => {
    const cm = EditorManager.getCM();
    const query = _getQuery();
    const replacement = _getReplacement();
    if (!query) return;
    const sel = cm.getSelection();
    if (sel && sel === query) {
      cm.replaceSelection(replacement, 'start');
      _buildMatches();
      findNext();
    } else {
      findNext();
    }
  };

  const replaceAll = () => {
    const cm = EditorManager.getCM();
    const query = _getQuery();
    const replacement = _getReplacement();
    if (!query) return;
    let count = 0;
    cm.operation(() => {
      const cursor = cm.getSearchCursor(query, CodeMirror.Pos(0, 0), { caseFold: true });
      while (cursor.findNext()) {
        cursor.replace(replacement);
        count++;
      }
    });
    _info(`${count} substituição(ões) feita(s)`);
    _buildMatches();
    ToastManager.show(`${count} substituição(ões) feita(s)`, count > 0 ? 'success' : 'info');
  };

  const toggle = () => { _isOpen ? close() : open(); };
  const open = () => {
    document.getElementById('find-panel').classList.add('open');
    document.getElementById('firebase-panel').classList.remove('open');
    _isOpen = true;
    setTimeout(() => document.getElementById('find-input').focus(), 150);
  };
  const close = () => {
    document.getElementById('find-panel').classList.remove('open');
    _isOpen = false;
    EditorManager.focus();
  };

  const init = () => {
    document.getElementById('find-next').addEventListener('click', findNext);
    document.getElementById('find-prev').addEventListener('click', findPrev);
    document.getElementById('find-replace-one').addEventListener('click', replaceOne);
    document.getElementById('find-replace-all').addEventListener('click', replaceAll);
    document.getElementById('find-close').addEventListener('click', close);
    document.getElementById('find-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.shiftKey ? findPrev() : findNext(); }
      if (e.key === 'Escape') close();
    });
    document.getElementById('replace-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') replaceOne();
      if (e.key === 'Escape') close();
    });
    document.getElementById('find-input').addEventListener('input', () => { _lastQuery = ''; });
  };

  return { init, toggle, open, close, findNext, findPrev };
})();