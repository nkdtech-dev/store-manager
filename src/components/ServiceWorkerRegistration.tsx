'use client'
import { useEffect } from 'react'
import { pullFromSupabase } from '@/lib/sync'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          console.log('[SW] Registered', reg.scope)
          // Pre-cache key pages
          caches.open('nda-store-v2').then(cache => {
            cache.addAll([
              '/dashboard',
              '/inventory',
              '/sales',
              '/stock',
              '/settings',
              '/analytics',
            ]).catch(() => {}) // Ignore errors for individual pages
          })
        })
        .catch(err => console.warn('[SW] Registration failed', err))
    }

    // Pull data into local DB when online
    if (navigator.onLine) {
      pullFromSupabase().then(() => {
        console.log('[App] Data synced to local DB')
      })
    }
  }, [])

  return null
}
