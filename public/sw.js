const CACHE_NAME = 'nda-store-v2'

// On install — take control immediately
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Never cache: Supabase API calls, auth, POST requests
  if (url.hostname.includes('supabase.co')) return
  if (event.request.method !== 'GET') return
  if (url.pathname.startsWith('/api/')) return

  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      // Try network first
      try {
        const networkResponse = await fetch(event.request)
        // Cache everything that succeeds
        if (networkResponse.ok) {
          cache.put(event.request, networkResponse.clone())
        }
        return networkResponse
      } catch {
        // Network failed — serve from cache
        const cached = await cache.match(event.request)
        if (cached) return cached

        // For navigation requests (page refreshes), return the cached dashboard
        if (event.request.mode === 'navigate') {
          const dashboard = await cache.match('/dashboard')
          if (dashboard) return dashboard
        }

        // Nothing in cache either
        return new Response('Offline — please wait for connection', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        })
      }
    })
  )
})
