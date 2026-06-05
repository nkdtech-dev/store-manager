import Dexie, { type Table } from 'dexie'

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

export interface LocalSale {
  id: string
  receipt_number: string
  cashier_id: string | null
  cashier_name: string | null
  total_amount: number
  discount: number
  payment_method: string
  notes: string | null
  created_at: string
}

export interface LocalSaleItem {
  id: string
  sale_id: string
  product_id: string
  product_name: string | null
  product_code: string | null
  quantity: number
  unit_price: number
  discount: number
  subtotal: number
  created_at: string
}

export interface LocalStockMovement {
  id: string
  product_id: string
  product_name: string | null
  product_code: string | null
  type: string
  quantity: number
  note: string | null
  created_by: string | null
  created_by_name: string | null
  created_at: string
}

export interface LocalExpense {
  id: string
  description: string
  amount: number
  category: string
  recorded_by: string | null
  created_at: string
}

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
  sales!: Table<LocalSale>
  sale_items!: Table<LocalSaleItem>
  stock_movements!: Table<LocalStockMovement>
  expenses!: Table<LocalExpense>
  sync_queue!: Table<SyncQueue>

  constructor() {
    super('NDAStoreDB')
    this.version(2).stores({
      products: 'id, code, name, category_id, stock_quantity',
      categories: 'id, name',
      profiles: 'id, email, role',
      sales: 'id, created_at, cashier_id',
      sale_items: 'id, sale_id, product_id',
      stock_movements: 'id, product_id, created_at, type',
      expenses: 'id, created_at, category',
      sync_queue: '++id, table, operation, created_at',
    })
  }
}

export const localDb = new StoreDatabase()
