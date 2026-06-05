export type UserRole = 'admin' | 'cashier'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  last_login_at: string | null
  created_at: string
}

export interface Category {
  id: string
  name: string
  description: string | null
  created_at: string
}

export interface Product {
  id: string
  code: string
  name: string
  description: string | null
  category_id: string | null
  category?: Category
  image_url: string | null
  cost_price: number
  selling_price: number
  stock_quantity: number
  min_stock_level: number
  unit: string
  created_at: string
  updated_at: string
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  product?: Product
  quantity: number
  unit_price: number
  subtotal: number
}

export interface Sale {
  id: string
  receipt_number: string
  cashier_id: string
  cashier?: Profile
  total_amount: number
  payment_method: 'cash' | 'card' | 'transfer'
  notes: string | null
  created_at: string
  items?: SaleItem[]
}

export interface DashboardStats {
  totalProducts: number
  totalSalesToday: number
  revenueToday: number
  lowStockCount: number
  totalRevenue: number
  totalStockValue: number
}
