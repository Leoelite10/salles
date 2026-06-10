const CACHE  = 'sales-intel-v9';

// Recursos que NUNCA devem ser cacheados pelo SW:
// - Firebase (autenticação e dados)
// - Tailwind Play CDN: sem versão na URL, a cópia cacheada fica obsoleta
//   e faz os ícones aparecerem enormes pois as classes Tailwind param de funcionar
// - Google Fonts CSS: referencia arquivos de fonte que precisam ser resolvidos na rede
const ALWAYS_NETWORK = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebase',
  'gstatic.com/firebasejs',
  'cdn.tailwindcss.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// Instala: pré-cacheia o shell da aplicação
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['/', '/index.html'])).then(() => self.skipWaiting())
  );
});

// Ativa: remove caches antigos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (e.request.method !== 'GET') return;
  if (ALWAYS_NETWORK.some(s => url.includes(s))) return; // sempre rede para Firebase

  if (e.request.mode === 'navigate') {
    // Navegação: rede primeiro, fallback para cache
    e.respondWith(
      fetch(e.request)
        .then(res => { cache(e.request, res.clone()); return res; })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Assets (CDN, fontes, etc.): cache primeiro
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => { cache(e.request, res.clone()); return res; });
    })
  );
});

function cache(req, res) {
  if (!res || res.status !== 200 || res.type === 'opaque') return;
  caches.open(CACHE).then(c => c.put(req, res));
}
