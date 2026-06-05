'use client'
import { useEffect, createContext, useContext, useState, useCallback } from 'react'
import { pullFromSupabase, fullSync } from '@/lib/sync'
import { localDb } from '@/lib/localDb'
import type { LocalProduct, LocalCategory } from '@/lib/localDb'

interface SyncContextType {
  products: LocalProduct[]
  categories: LocalCategory[]
  isLoading: boolean
  refresh: () => Promise<void>
}

const SyncContext = createContext<SyncContextType>({
  products: [],
  categories: [],
  isLoading: true,
  refresh: async () => {},
})

export function useSyncData() {
  return useContext(SyncContext)
}

export default function SyncProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<LocalProduct[]>([])
  const [categories, setCategories] = useState<LocalCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadFromLocal = useCallback(async () => {
    const [prods, cats] = await Promise.all([
      localDb.products.orderBy('name').toArray(),
      localDb.categories.orderBy('name').toArray(),
    ])
    setProducts(prods)
    setCategories(cats)
  }, [])

  const refresh = useCallback(async () => {
    setIsLoading(true)
    if (navigator.onLine) {
      await fullSync()
    }
    await loadFromLocal()
    setIsLoading(false)
  }, [loadFromLocal])

  useEffect(() => {
    async function init() {
      // First load from local (instant, works offline)
      await loadFromLocal()
      setIsLoading(false)

      // Then try to sync with Supabase if online
      if (navigator.onLine) {
        await pullFromSupabase()
        await loadFromLocal()
      }
    }
    init()
  }, [loadFromLocal])

  return (
    <SyncContext.Provider value={{ products, categories, isLoading, refresh }}>
      {children}
    </SyncContext.Provider>
  )
}
