import Dexie, { type Table } from 'dexie'

// Local copies of Supabase tables
export interface LocalProduct {
  id: string
  code: string
  name: string
  description: string | null
  category_id: string | null
  category_name: string | null
  image_url: string | null
  cost_price: number
  selling_price: number
  stock_quantity: number
  min_stock_level: number
  unit: string
  updated_at: string
  synced_at: string
}

export interface LocalCategory {
  id: string
  name: string
  description: string | null
}

export interface LocalProfile {
  id: string
  email: string
  full_name: string
  role: string
  last_login_at: string | null
}

// Pending operations to sync when online
export interface SyncQueue {
  id?: number
  operation: 'insert' | 'update' | 'delete'
  table: string
  data: Record<string, unknown>
  created_at: string
  attempts: number
}

export class StoreDatabase extends Dexie {
  products!: Table<LocalProduct>
  categories!: Table<LocalCategory>
  profiles!: Table<LocalProfile>
  sync_queue!: Table<SyncQueue>

  constructor() {
    super('NDAStoreDB')
    this.version(1).stores({
      products: 'id, code, name, category_id, stock_quantity',
      categories: 'id, name',
      profiles: 'id, email, role',
      sync_queue: '++id, table, operation, created_at',
    })
  }
}

export const localDb = new StoreDatabase()
