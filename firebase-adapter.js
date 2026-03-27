/* ========== FIREBASE ADAPTER ==========
   Toda a comunicação com o Firebase passa exclusivamente por este adapter.
   Substituir ou modificar o Firebase nunca afetará o resto do app.
   Interface pública: connect(config), saveProject(name, content), loadProject(name)

   ⚠️  SEGURANÇA:
     - A apiKey NUNCA é persistida em localStorage ou IndexedDB.
     - Apenas o projectId (não sensível) é salvo para pré-preencher o campo.
     - A apiKey só existe na memória durante a sessão atual.
   ===================================== */

const FirebaseAdapter = (() => {
  let _db = null;
  let _isConnected = false;

  // Estado da UI do painel
  const _setStatus = (state, msg) => {
    const dot = document.getElementById('fb-dot');
    dot.className = 'fb-dot ' + state;
    document.getElementById('fb-status-text').textContent = msg;
    const canOp = _isConnected;
    document.getElementById('fb-save-cloud').disabled = !canOp;
    document.getElementById('fb-load-cloud').disabled = !canOp;
  };

  // Carrega scripts do Firebase dinamicamente
  const _loadFirebaseScripts = () => {
    if (window.firebase) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const loadScript = (src) => new Promise((res, rej) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = res;
        script.onerror = rej;
        document.head.appendChild(script);
      });
      Promise.all([
        loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js'),
        loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js')
      ]).then(resolve).catch(reject);
    });
  };

  // Conecta ao Firebase Firestore usando os dados inseridos pelo usuário
  const connect = async (config) => {
    try {
      _setStatus('disconnected', 'Conectando...');
      await _loadFirebaseScripts();
      if (firebase.apps.length > 0) firebase.apps[0].delete();
      const app = firebase.initializeApp({
        apiKey: config.apiKey,
        authDomain: `${config.projectId}.firebaseapp.com`,
        projectId: config.projectId,
      });
      _db = firebase.firestore(app);
      await _db.collection('projects').limit(1).get();
      _isConnected = true;
      _setStatus('connected', `Conectado: ${config.projectId}`);

      // ✅ Persiste apenas o projectId — apiKey fica só na memória
      localStorage.setItem(AppConfig.LS_KEYS.FB_PROJECT, config.projectId);

      // Limpa o campo de apiKey da UI após conexão bem-sucedida
      document.getElementById('fb-api-key').value = '';

      ToastManager.show('Firebase conectado!', 'success');
    } catch (err) {
      _isConnected = false;
      console.error('[FirebaseAdapter] Erro de conexão:', err);
      _setStatus('error', 'Erro: verifique credenciais e regras do Firestore');
      ToastManager.show('Falha ao conectar ao Firebase', 'error');
    }
  };

  // Salva o projeto no Firestore
  const saveProject = async (docName, content, filename, lang) => {
    if (!_db) { ToastManager.show('Conecte ao Firebase primeiro', 'warning'); return false; }
    try {
      await _db.collection('projects').doc(docName).set({
        content, filename, lang,
        updatedAt: new Date().toISOString(),
        appVersion: AppConfig.VERSION,
      });
      ToastManager.show(`"${docName}" salvo na nuvem`, 'success');
      FileManager.setDirty(false);
      return true;
    } catch (err) {
      console.error('[FirebaseAdapter] Erro ao salvar:', err);
      ToastManager.show('Erro ao salvar na nuvem', 'error');
      return false;
    }
  };

  // Carrega o projeto do Firestore
  const loadProject = async (docName) => {
    if (!_db) { ToastManager.show('Conecte ao Firebase primeiro', 'warning'); return null; }
    try {
      const snap = await _db.collection('projects').doc(docName).get();
      if (!snap.exists) { ToastManager.show('Projeto não encontrado', 'warning'); return null; }
      const data = snap.data();
      ToastManager.show(`"${docName}" carregado da nuvem`, 'success');
      return data;
    } catch (err) {
      console.error('[FirebaseAdapter] Erro ao carregar:', err);
      ToastManager.show('Erro ao carregar da nuvem', 'error');
      return null;
    }
  };

  const isConnected = () => _isConnected;

  const initPanel = () => {
    // ✅ Só pré-preenche projectId — apiKey nunca é recuperada do storage
    const savedProjectId = localStorage.getItem(AppConfig.LS_KEYS.FB_PROJECT);
    if (savedProjectId) {
      document.getElementById('fb-project-id').value = savedProjectId;
    }

    document.getElementById('fb-connect').addEventListener('click', async () => {
      const projectId = document.getElementById('fb-project-id').value.trim();
      const apiKey = document.getElementById('fb-api-key').value.trim();
      if (!projectId || !apiKey) {
        ToastManager.show('Preencha Project ID e API Key', 'warning');
        return;
      }
      await connect({ projectId, apiKey });
    });

    document.getElementById('fb-save-cloud').addEventListener('click', async () => {
      let docName = document.getElementById('fb-doc-name').value.trim();
      if (!docName) docName = FileManager.getFilename();
      if (!docName) { ToastManager.show('Defina um nome para o projeto', 'warning'); return; }
      await saveProject(docName, EditorManager.getValue(), FileManager.getFilename(), LangManager.current());
    });

    document.getElementById('fb-load-cloud').addEventListener('click', async () => {
      const docName = document.getElementById('fb-doc-name').value.trim();
      if (!docName) { ToastManager.show('Digite o nome do projeto', 'warning'); return; }

      // ✅ Confirma antes de sobrescrever alterações não salvas
      const isDirty = FileManager.getFilename && EditorManager.getValue() !== '';
      const confirmed = await ModalManager.confirm(
        'Carregar da nuvem?',
        'O conteúdo atual do editor será substituído pelo projeto da nuvem.'
      );
      if (!confirmed) return;

      const data = await loadProject(docName);
      if (data) {
        EditorManager.setValue(data.content || '');
        if (data.filename) FileManager.setFilename(data.filename);
        if (data.lang) LangManager.setMode(data.lang);
        FileManager.setDirty(false);
      }
    });
  };

  // Tenta conectar automaticamente se as credenciais foram fornecidas no FIREBASE_CONFIG
  const autoConnect = async () => {
    if (FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.apiKey) {
      document.getElementById('fb-project-id').value = FIREBASE_CONFIG.projectId;
      // Não exibe a apiKey na UI — conecta direto
      if (FIREBASE_CONFIG.defaultDocName) {
        document.getElementById('fb-doc-name').value = FIREBASE_CONFIG.defaultDocName;
      }
      await connect({ projectId: FIREBASE_CONFIG.projectId, apiKey: FIREBASE_CONFIG.apiKey });
    }
  };

  return { connect, saveProject, loadProject, isConnected, initPanel, autoConnect };
})();
