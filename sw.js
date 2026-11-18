// Cache offline: el juego funciona sin conexión una vez abierto.
// Al publicar cambios, subir el número de CACHE para que los celulares bajen los archivos nuevos.
const CACHE = 'granecro-v3';
const FILES = [
  './', 'index.html', 'styles.css', 'cards.js', 'game.js', 'app.js', 'manifest.json',
  'assets/logo.webp', 'assets/icon-192.png', 'assets/icon-512.png',
  'assets/cards/abyssal_language.webp', 'assets/cards/advanced_blood_rituals.webp', 'assets/cards/back.webp', 'assets/cards/banishing_the_undead.webp', 'assets/cards/conjuring_spirit_knights.webp', 'assets/cards/defense_against_curses.webp', 'assets/cards/drain_spell_seminar.webp', 'assets/cards/dream_invasion.webp', 'assets/cards/graveyards_of_the_realm.webp', 'assets/cards/heraldry_of_the_astrals.webp', 'assets/cards/history_of_the_void.webp', 'assets/cards/holy_animals.webp', 'assets/cards/invoking_shadowspawns.webp', 'assets/cards/poison_brewing.webp', 'assets/cards/practice_magic_staffs.webp', 'assets/cards/sanity_boost.webp', 'assets/cards/sigils_of_power.webp', 'assets/cards/soul_mending.webp', 'assets/cards/speaking_with_the_dead.webp', 'assets/cards/spellbook_writing.webp', 'assets/cards/tired.webp', 'assets/cards/transference_of_life.webp',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Red primero (para recibir actualizaciones); si no hay conexión, usa el caché.
// 'no-cache' obliga a consultar al servidor: si no, el navegador puede mezclar un
// index.html nuevo con un app.js viejo guardado hasta 10 minutos.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const req = new Request(e.request, { cache: 'no-cache' });
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
