/* ========== APP (ORQUESTRADOR PRINCIPAL) ==========
   Inicializa todos os módulos, carrega dados persistidos,
   gerencia migração do localStorage e eventos da UI.
   ================================================= */

const App = (() => {
  const _initEvents = () => {
    // Toolbar
    document.getElementById('btn-new').addEventListener('click', () => FileManager.newFile());
    document.getElementById('btn-open').addEventListener('click', () => FileManager.importFile());
    document.getElementById('btn-save').addEventListener('click', () => FileManager.exportFile());
    document.getElementById('btn-undo').addEventListener('click', () => EditorManager.getCM()?.undo());
    document.getElementById('btn-redo').addEventListener('click', () => EditorManager.getCM()?.redo());
    document.getElementById('btn-find').addEventListener('click', () => FindReplaceManager.toggle());
    document.getElementById('btn-theme').addEventListener('click', () => ThemeManager.toggle());
    document.getElementById('filename-chip').addEventListener('click', () => FileManager.renameFile());

    // Firebase panel toggle
    document.getElementById('btn-firebase').addEventListener('click', () => {
      const panel = document.getElementById('firebase-panel');
      const isOpen = panel.classList.contains('open');
      panel.classList.toggle('open', !isOpen);
      if (!isOpen) document.getElementById('find-panel').classList.remove('open');
    });
    document.getElementById('firebase-close').addEventListener('click', () => {
      document.getElementById('firebase-panel').classList.remove('open');
    });

    // Atalhos globais
    document.addEventListener('keydown', (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 's') { e.preventDefault(); FileManager.exportFile(); }
      if (ctrl && e.key === 'o') { e.preventDefault(); FileManager.importFile(); }
      if (ctrl && e.key === 'h') { e.preventDefault(); FindReplaceManager.toggle(); }
    });

    // Previne comportamento padrão do Touch no iOS que causa scroll indesejado
    document.getElementById('toolbar').addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    document.getElementById('statusbar').addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  };

  const init = async () => {
    ThemeManager.init();
    ModalManager.init();

    const { IDB_KEYS } = AppConfig;
    let savedData = await StorageManager.getMany([
      IDB_KEYS.CONTENT,
      IDB_KEYS.FILENAME,
      IDB_KEYS.LANG,
    ]);

    // Migração localStorage → IndexedDB (versão anterior)
    const legacyKeys = { content: 'cc_content', filename: 'cc_filename', lang: 'cc_lang' };
    const needsMigration = !savedData[IDB_KEYS.CONTENT] && localStorage.getItem(legacyKeys.content);
    if (needsMigration) {
      console.info('[App] Migrando dados de localStorage → IndexedDB...');
      savedData = {
        [IDB_KEYS.CONTENT]:  localStorage.getItem(legacyKeys.content),
        [IDB_KEYS.FILENAME]: localStorage.getItem(legacyKeys.filename),
        [IDB_KEYS.LANG]:     localStorage.getItem(legacyKeys.lang),
      };
      await Promise.all([
        StorageManager.set(IDB_KEYS.CONTENT,  savedData[IDB_KEYS.CONTENT]),
        StorageManager.set(IDB_KEYS.FILENAME, savedData[IDB_KEYS.FILENAME]),
        StorageManager.set(IDB_KEYS.LANG,     savedData[IDB_KEYS.LANG]),
      ]);
      [legacyKeys.content, legacyKeys.filename, legacyKeys.lang].forEach(k => localStorage.removeItem(k));
    }

    LangManager.init();
    LangManager.setInitialMode(savedData[IDB_KEYS.LANG] || AppConfig.DEFAULT_LANG);
    FileManager.init(savedData[IDB_KEYS.FILENAME]);

    // Aguarda CodeMirror estar disponível (carregado via CDN)
    // Timeout de 10s para evitar loading infinito caso o CDN falhe
    await new Promise((res, rej) => {
      if (window.CodeMirror) return res();
      let elapsed = 0;
      const check = setInterval(() => {
        elapsed += 50;
        if (window.CodeMirror) { clearInterval(check); res(); }
        else if (elapsed >= 10000) {
          clearInterval(check);
          rej(new Error('CodeMirror não carregou (timeout). Verifique sua conexão.'));
        }
      }, 50);
    }).catch(err => {
      console.error('[App] Erro crítico:', err.message);
      const loading = document.getElementById('loading-screen');
      if (loading) {
        loading.innerHTML = `
          <div style="text-align:center;padding:32px;color:#f0f0f8;font-family:sans-serif">
            <div style="font-size:48px;margin-bottom:16px">⚠️</div>
            <div style="font-size:20px;font-weight:700;margin-bottom:8px">Falha ao carregar</div>
            <div style="font-size:14px;color:#a0a0c0;margin-bottom:24px">${err.message}</div>
            <button onclick="location.reload()" style="background:#6366f1;color:white;border:none;padding:12px 28px;border-radius:10px;font-size:15px;cursor:pointer">Tentar novamente</button>
          </div>`;
      }
      throw err;
    });

    EditorManager.init(savedData[IDB_KEYS.CONTENT]);

    FindReplaceManager.init();
    FirebaseAdapter.initPanel();
    PWAManager.init();
    _initEvents();

    FileManager.setDirty(false);

    // Auto-conexão Firebase se credenciais fornecidas
    await FirebaseAdapter.autoConnect();

    // Remove tela de carregamento
    const loading = document.getElementById('loading-screen');
    const appEl = document.getElementById('app');
    setTimeout(() => {
      loading.classList.add('fade');
      appEl.style.opacity = '1';
      appEl.style.transition = 'opacity 0.4s ease';
      setTimeout(() => loading.remove(), 500);
      EditorManager.focus();
    }, 400);
  };

  return { init };
})();

// Inicialização após o DOM estar pronto
document.addEventListener('DOMContentLoaded', () => App.init());
