/* ========== FILE MANAGER ==========
   Gerencia nome do arquivo, importação do dispositivo e exportação.
   Estado: { filename, isDirty }
   ================================== */

const FileManager = (() => {
  let _filename = AppConfig.DEFAULT_FILENAME;
  let _isDirty = false;

  const _updateUI = () => {
    document.getElementById('chip-name').textContent = _filename;
    document.title = (_isDirty ? '● ' : '') + _filename + ' — ' + AppConfig.APP_NAME;
    const dot = document.getElementById('dirty-dot');
    dot.classList.toggle('saved', !_isDirty);
  };

  const setDirty = (dirty) => { _isDirty = dirty; _updateUI(); };
  const getFilename = () => _filename;

  const setFilename = (name) => {
    if (!name) return;
    _filename = name;
    const ext = name.split('.').pop().toLowerCase();
    if (AppConfig.EXT_TO_MODE[ext]) {
      LangManager.setMode(AppConfig.EXT_TO_MODE[ext]);
    }
    StorageManager.set(AppConfig.IDB_KEYS.FILENAME, name);
    _updateUI();
  };

  // ── Confirmação de descarte ─────────────────────────────────────────
  // Retorna true se pode prosseguir (sem alterações ou usuário confirmou descarte).
  const _confirmDiscard = async () => {
    if (!_isDirty) return true;
    return ModalManager.confirm(
      'Descartar alterações?',
      `"${_filename}" tem alterações não salvas. Descartar e continuar?`
    );
  };

  // ── Importa arquivo do dispositivo ─────────────────────────────────
  const importFile = async () => {
    if (!await _confirmDiscard()) return;
    document.getElementById('file-input').click();
  };

  const _handleFileInput = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      EditorManager.setValue(ev.target.result);
      setFilename(file.name);
      setDirty(false);
      ToastManager.show(`"${file.name}" carregado`, 'success');
    };
    reader.onerror = () => ToastManager.show('Erro ao ler o arquivo', 'error');
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  // ── Exporta arquivo para o dispositivo ─────────────────────────────
  const exportFile = () => {
    const content = EditorManager.getValue();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = _filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDirty(false);
    ToastManager.show(`"${_filename}" salvo no dispositivo`, 'success');
  };

  // ── Cria novo arquivo em branco ─────────────────────────────────────
  const newFile = async () => {
    if (!await _confirmDiscard()) return;
    const name = await ModalManager.open('Nome do novo arquivo', 'sem_titulo.js');
    if (name === null) return;
    EditorManager.setValue('');
    setFilename(name || AppConfig.DEFAULT_FILENAME);
    setDirty(false);
    ToastManager.show('Novo arquivo criado', 'info');
  };

  const renameFile = async () => {
    const name = await ModalManager.open('Renomear arquivo', _filename);
    if (name === null) return;
    setFilename(name || _filename);
    ToastManager.show('Arquivo renomeado', 'success');
  };

  const init = (savedFilename) => {
    _filename = savedFilename || AppConfig.DEFAULT_FILENAME;
    _updateUI();
    document.getElementById('file-input').addEventListener('change', _handleFileInput);
  };

  return { init, setDirty, getFilename, setFilename, importFile, exportFile, newFile, renameFile };
})();
