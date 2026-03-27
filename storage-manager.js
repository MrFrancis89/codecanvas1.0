/* ========== STORAGE MANAGER ==========
   Gerencia persistência de dados usando IndexedDB com fallback para localStorage.
   Todos os outros módulos consomem apenas esta API.
   ===================================== */

const StorageManager = (() => {
  const DB_NAME    = 'codecanvas_db';
  const DB_VERSION = 1;
  const STORE_NAME = 'keyval';
  let _db = null;

  // Abre (ou reabre) a conexão com o IndexedDB
  const _openDB = () => new Promise((resolve, reject) => {
    if (_db) return resolve(_db);
    if (!window.indexedDB) return reject(new Error('IndexedDB não suportado'));

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => {
      _db = e.target.result;
      _db.onversionchange = () => { _db.close(); _db = null; };
      resolve(_db);
    };
    request.onerror = (e) => reject(e.target.error);
    request.onblocked = () => reject(new Error('IndexedDB bloqueado'));
  });

  // Obtém uma transação
  const _tx = (db, mode) => db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
  
  // Converte IDBRequest em Promise
  const _promisify = (request) => new Promise((resolve, reject) => {
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror  = (e) => reject(e.target.error);
  });

  // --- API PÚBLICA ---
  const get = async (key) => {
    try {
      const db  = await _openDB();
      const val = await _promisify(_tx(db, 'readonly').get(key));
      return val ?? null;
    } catch (err) {
      console.warn(`[StorageManager] IDB fallback (get ${key})`, err.message);
      return localStorage.getItem(key);
    }
  };

  const set = async (key, value) => {
    try {
      const db = await _openDB();
      await _promisify(_tx(db, 'readwrite').put(value, key));
    } catch (err) {
      console.warn(`[StorageManager] IDB fallback (set ${key})`, err.message);
      localStorage.setItem(key, value);
    }
  };

  const del = async (key) => {
    try {
      const db = await _openDB();
      await _promisify(_tx(db, 'readwrite').delete(key));
    } catch (err) {
      localStorage.removeItem(key);
    }
  };

  const getMany = async (keys) => {
    try {
      const db    = await _openDB();
      const store = _tx(db, 'readonly');
      const pairs = await Promise.all(
        keys.map(k => _promisify(store.get(k)).then(v => [k, v ?? null]))
      );
      return Object.fromEntries(pairs);
    } catch (err) {
      console.warn('[StorageManager] IDB fallback (getMany)', err.message);
      return Object.fromEntries(keys.map(k => [k, localStorage.getItem(k)]));
    }
  };

  return { get, set, del, getMany };
})();