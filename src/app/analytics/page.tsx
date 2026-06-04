'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/AppShell'
import { TrendingUp, TrendingDown, DollarSign, Package, BarChart2 } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'

const COLORS = ['#16a34a', '#1d4ed8', '#7c3aed', '#ea580c', '#0891b2', '#dc2626']

export default function AnalyticsPage() {
  const [salesByDay, setSalesByDay] = useState<{ date: string; revenue: number; sales: number }[]>([])
  const [topProducts, setTopProducts] = useState<{ name: string; code: string; quantity: number; revenue: number }[]>([])
  const [categoryData, setCategoryData] = useState<{ name: string; value: number }[]>([])
  const [summary, setSummary] = useState({ totalRevenue: 0, totalCost: 0, totalSales: 0, totalProducts: 0 })
  const [range, setRange] = useState(30)
  const supabase = createClient()

  useEffect(() => { loadAnalytics() }, [range])

  async function loadAnalytics() {
    const since = new Date()
    since.setDate(since.getDate() - range)

    // Sales by day
    const { data: sales } = await supabase
      .from('sales')
      .select('created_at, total_amount')
      .gte('created_at', since.toISOString())
      .order('created_at')

    const dayMap: Record<string, { revenue: number; sales: number }> = {}
    sales?.forEach(s => {
      const d = s.created_at.split('T')[0]
      if (!dayMap[d]) dayMap[d] = { revenue: 0, sales: 0 }
      dayMap[d].revenue += Number(s.total_amount)
      dayMap[d].sales += 1
    })
    setSalesByDay(Object.entries(dayMap).map(([date, v]) => ({ date, ...v })))

    // Top products via sale_items
    const { data: items } = await supabase
      .from('sale_items')
      .select('quantity, subtotal, product:products(name, code)')
      .gte('created_at', since.toISOString())

    const prodMap: Record<string, { name: string; code: string; quantity: number; revenue: number }> = {}
    items?.forEach((i: any) => {
      const key = i.product?.code ?? 'unknown'
      if (!prodMap[key]) prodMap[key] = { name: i.product?.name ?? '', code: key, quantity: 0, revenue: 0 }
      prodMap[key].quantity += i.quantity
      prodMap[key].revenue += Number(i.subtotal)
    })
    setTopProducts(Object.values(prodMap).sort((a, b) => b.revenue - a.revenue).slice(0, 8))

    // Category breakdown (stock value)
    const { data: prods } = await supabase
      .from('products')
      .select('selling_price, stock_quantity, category:categories(name)')
    const catMap: Record<string, number> = {}
    prods?.forEach((p: any) => {
      const cat = p.category?.name ?? 'Uncategorized'
      catMap[cat] = (catMap[cat] ?? 0) + Number(p.selling_price) * p.stock_quantity
    })
    setCategoryData(Object.entries(catMap).map(([name, value]) => ({ name, value })))

    // Summary
    const totalRevenue = sales?.reduce((s, x) => s + Number(x.total_amount), 0) ?? 0
    const { data: allProds } = await supabase.from('products').select('cost_price, stock_quantity')
    const totalCost = allProds?.reduce((s, p) => s + Number(p.cost_price) * p.stock_quantity, 0) ?? 0
    setSummary({ totalRevenue, totalCost, totalSales: sales?.length ?? 0, totalProducts: allProds?.length ?? 0 })
  }

  const profit = summary.totalRevenue - (summary.totalRevenue * 0.7)

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
            <p className="text-slate-500 text-sm">Store performance overview</p>
          </div>
          <div className="flex gap-2">
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setRange(d)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  range === d ? 'bg-green-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-green-400'
                }`}>
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue', value: `${summary.totalRevenue.toLocaleString('en')} FCFA`, icon: DollarSign, color: 'text-green-700 bg-green-50', iconBg: 'bg-green-100' },
            { label: 'Total Sales', value: summary.totalSales, icon: BarChart2, color: 'text-blue-700 bg-blue-50', iconBg: 'bg-blue-100' },
            { label: 'Estimated Profit', value: `${profit.toLocaleString('en', { maximumFractionDigits: 0 })} FCFA`, icon: TrendingUp, color: 'text-purple-700 bg-purple-50', iconBg: 'bg-purple-100' },
            { label: 'Stock Value', value: `${summary.totalCost.toLocaleString('en', { maximumFractionDigits: 0 })} FCFA`, icon: Package, color: 'text-orange-700 bg-orange-50', iconBg: 'bg-orange-100' },
          ].map(card => (
            <div key={card.label} className={`rounded-2xl p-5 ${card.color}`}>
              <div className={`inline-flex p-2 rounded-xl mb-3 ${card.iconBg}`}>
                <card.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-sm opacity-70 mt-1">{card.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue over time */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-700 mb-4">Revenue Over Time</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={salesByDay}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${v.toLocaleString('en')} FCFA`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#16a34a" fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Sales count over time */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-700 mb-4">Daily Sales Count</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={salesByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [v, 'Sales']} />
                <Bar dataKey="sales" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top products */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-700 mb-4">Top Products by Revenue</h3>
            {topProducts.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">No sales data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip formatter={(v: number) => [`${v.toLocaleString('en')} FCFA`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="#16a34a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Category stock value */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-700 mb-4">Stock Value by Category</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={85}
                  dataKey="value" nameKey="name" paddingAngle={3}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v.toLocaleString('en', { maximumFractionDigits: 0 })} FCFA`]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
