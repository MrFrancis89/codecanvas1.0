/* ========== PWA MANAGER ==========
   Registra o Service Worker e gera o Web App Manifest dinamicamente.
   Suporta instalação no celular e funcionamento offline.

   Correções aplicadas:
     - Cache versionado com AppConfig.VERSION → invalida automaticamente em updates
     - Scope do SW omitido (browser usa o diretório da página, mais compatível)
     - Registro do SW com tratamento de erro robusto
   ================================= */

const PWAManager = (() => {
  // Versão do cache derivada da versão do app — muda o cache em cada release
  const CACHE_NAME = `codecanvas-v${AppConfig.VERSION}`;

  // Service Worker: intercepta fetch para cache offline
  const SW_CODE = `
const CACHE = '${CACHE_NAME}';
const PRECACHE = [
  'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.17/codemirror.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.17/theme/one-dark.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.17/addon/search/matchesonscrollbar.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.17/addon/fold/foldgutter.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.17/codemirror.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.17/mode/javascript/javascript.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.17/mode/htmlmixed/htmlmixed.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.17/mode/css/css.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.17/mode/python/python.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] Falha no precache:', err))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Ignora requisições não-GET e requests de extensões do browser
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith('http')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const clone = response.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return response;
      }).catch(() => new Response('Offline — recurso não disponível no cache.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      }));
    })
  );
});
`;

  // Manifest dinâmico
  const MANIFEST = {
    name: 'CodeCanvas',
    short_name: 'CodeCanvas',
    description: 'Editor de código PWA com design Apple',
    start_url: '.',
    display: 'standalone',
    orientation: 'any',
    background_color: '#0a0a0f',
    theme_color: '#6366f1',
    icons: [
      { src: _generateIcon(192), sizes: '192x192', type: 'image/png' },
      { src: _generateIcon(512), sizes: '512x512', type: 'image/png' },
    ],
    categories: ['productivity', 'utilities'],
  };

  // Gera ícone SVG → base64 (simples, funcional)
  function _generateIcon(size) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#0a0a0f"/>
      <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#g)"/>
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#6366f1"/>
          <stop offset="100%" stop-color="#a78bfa"/>
        </linearGradient>
      </defs>
      <text x="50%" y="56%" font-size="${size * 0.45}" font-family="monospace" font-weight="bold"
        fill="white" text-anchor="middle" dominant-baseline="middle">&lt;/&gt;</text>
    </svg>`;
    return 'data:image/svg+xml;base64,' + btoa(svg);
  }

  const init = () => {
    // Injeta link para o manifest via Data URI
    const manifestBlob = new Blob([JSON.stringify(MANIFEST)], { type: 'application/manifest+json' });
    const manifestURL = URL.createObjectURL(manifestBlob);
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = manifestURL;
    document.head.appendChild(link);

    // Registra Service Worker via Blob URL
    // ✅ Sem scope explícito: o browser usa o diretório da página atual,
    //    que é compatível com a blob: URL em todos os browsers modernos.
    if ('serviceWorker' in navigator) {
      const swBlob = new Blob([SW_CODE], { type: 'application/javascript' });
      const swURL = URL.createObjectURL(swBlob);
      navigator.serviceWorker.register(swURL)
        .then(reg => {
          console.log('[PWA] Service Worker registrado. Cache:', CACHE_NAME);
          // Verifica updates ao navegar
          reg.addEventListener('updatefound', () => {
            console.log('[PWA] Nova versão do Service Worker instalando...');
          });
        })
        .catch(err => console.warn('[PWA] Service Worker não registrado (modo file:// ou CSP):', err.message));
    }
  };

  return { init };
})();
