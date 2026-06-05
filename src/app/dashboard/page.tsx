'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/AppShell'
import ProductPopup from '@/components/ProductPopup'
import { Package, ShoppingCart, TrendingUp, AlertTriangle, Search, Bell } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Product, DashboardStats } from '@/types'
import Image from 'next/image'
import { localDb } from '@/lib/localDb'
import { pullFromSupabase } from '@/lib/sync'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [filtered, setFiltered] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Product | null>(null)
  const [similarProducts, setSimilarProducts] = useState<Product[]>([])
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadDashboard()
  }, [])

  useEffect(() => {
    if (!search.trim()) { setFiltered(products); return }
    const q = search.toLowerCase()
    setFiltered(products.filter(p =>
      p.code.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      (p as any).category_name?.toLowerCase().includes(q)
    ))
  }, [search, products])

  async function loadDashboard() {
    // Load from local DB first (works offline, instant)
    const localProds = await localDb.products.orderBy('name').toArray()
    if (localProds.length > 0) {
      const mapped = localProds.map(p => ({
        ...p,
        category: p.category_name ? { id: p.category_id ?? '', name: p.category_name, description: null, created_at: '' } : undefined
      })) as unknown as Product[]
      setProducts(mapped)
      setFiltered(mapped)
    }

    // Sync from Supabase if online
    if (navigator.onLine) {
      await pullFromSupabase()
      const refreshed = await localDb.products.orderBy('name').toArray()
      const mapped = refreshed.map(p => ({
        ...p,
        category: p.category_name ? { id: p.category_id ?? '', name: p.category_name, description: null, created_at: '' } : undefined
      })) as unknown as Product[]
      setProducts(mapped)
      setFiltered(mapped)
    }

    // All stats from local DB — works fully offline
    const allLocalProds = await localDb.products.toArray()
    const totalProducts = allLocalProds.length
    const lowStockCount = allLocalProds.filter(p => p.stock_quantity <= p.min_stock_level).length
    const totalStockValue = allLocalProds.reduce((s, p) => s + p.stock_quantity * p.cost_price, 0)

    const today = new Date().toISOString().split('T')[0]
    const allLocalSales = await localDb.sales.toArray()
    const todaySales = allLocalSales.filter(s => s.created_at.startsWith(today))
    const revenueToday = todaySales.reduce((s, sale) => s + sale.total_amount, 0)
    const totalSalesToday = todaySales.length
    const totalRevenue = allLocalSales.reduce((s, sale) => s + sale.total_amount, 0)

    setStats({ totalProducts, totalSalesToday, revenueToday, lowStockCount, totalRevenue, totalStockValue })
  }

  async function openProduct(product: Product) {
    setSelected(product)
    if (product.category_id) {
      const { data } = await supabase
        .from('products')
        .select('*, category:categories(id,name,description,created_at)')
        .eq('category_id', product.category_id)
        .neq('id', product.id)
        .limit(3)
      setSimilarProducts(data ?? [])
    } else {
      setSimilarProducts([])
    }
  }

  const statCards = stats ? [
    { label: 'Total Products', value: stats.totalProducts, icon: Package, color: 'bg-blue-50 text-blue-700', iconBg: 'bg-blue-100' },
    { label: "Today's Sales", value: stats.totalSalesToday, icon: ShoppingCart, color: 'bg-green-50 text-green-700', iconBg: 'bg-green-100' },
    { label: "Today's Revenue", value: `${stats.revenueToday.toLocaleString('en')} FCFA`, icon: TrendingUp, color: 'bg-purple-50 text-purple-700', iconBg: 'bg-purple-100' },
    { label: 'Low Stock Items', value: stats.lowStockCount, icon: AlertTriangle, color: 'bg-red-50 text-red-700', iconBg: 'bg-red-100' },
  ] : []

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm">Overview of your store</p>
        </div>

        {/* Low Stock Banner */}
        {stats && stats.lowStockCount > 0 && (
          <Link href="/stock" className="block">
            <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-center gap-4 hover:bg-red-100 transition-colors cursor-pointer">
              <div className="bg-red-100 p-2 rounded-xl flex-shrink-0">
                <Bell className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-red-700">
                  ⚠️ {stats.lowStockCount} item{stats.lowStockCount !== 1 ? 's are' : ' is'} running low on stock
                </p>
                <p className="text-sm text-red-500 mt-0.5">Tap here to view and restock them now</p>
              </div>
              <span className="text-red-500 text-sm font-medium">View →</span>
            </div>
          </Link>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map(card => (
            <div key={card.label} className={`rounded-2xl p-5 ${card.color}`}>
              <div className={`inline-flex p-2 rounded-xl mb-3 ${card.iconBg}`}>
                <card.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-sm opacity-70 mt-1">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Search + Product Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-700">Products</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by code or name…"
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-64"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filtered.map(product => {
              const isLow = product.stock_quantity <= product.min_stock_level
              return (
                <button
                  key={product.id}
                  onClick={() => openProduct(product)}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-green-400 hover:shadow-md p-4 text-left transition-all group"
                >
                  <div className="aspect-square bg-slate-100 rounded-xl mb-3 overflow-hidden flex items-center justify-center">
                    {product.image_url
                      ? <Image src={product.image_url} alt={product.name} width={120} height={120} className="object-cover w-full h-full" />
                      : <Package className="w-10 h-10 text-slate-300 group-hover:text-slate-400" />
                    }
                  </div>
                  <span className="text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{product.code}</span>
                  <p className="text-sm font-medium text-slate-700 mt-1 truncate">{product.name}</p>
                  <p className="text-sm font-bold text-green-600 mt-1">{product.selling_price.toLocaleString('en')} FCFA</p>
                  <div className={`text-xs mt-1 font-medium ${isLow ? 'text-red-500' : 'text-slate-400'}`}>
                    {isLow ? '⚠ Low: ' : 'Stock: '}{product.stock_quantity} {product.unit}
                  </div>
                </button>
              )
            })}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-16 text-slate-400">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No products found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selected && (
        <ProductPopup
          product={selected}
          similarProducts={similarProducts}
          onClose={() => setSelected(null)}
          onAddToSale={(product) => {
            router.push(`/sales?add=${product.code}`)
          }}
        />
      )}
    </AppShell>
  )
}
