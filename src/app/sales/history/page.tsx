'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { localDb } from '@/lib/localDb'
import AppShell from '@/components/AppShell'
import { Search, Calendar, ChevronDown, Receipt, Package, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface SaleRow {
  id: string
  receipt_number: string
  total_amount: number
  payment_method: string
  created_at: string
  cashier: { full_name: string } | null
  items: {
    quantity: number
    unit_price: number
    subtotal: number
    product: { name: string; code: string } | null
  }[]
}

type QuickRange = 'today' | 'week' | 'month' | 'year' | 'custom'

function getRange(range: QuickRange): { from: string; to: string } {
  const now = new Date()
  const to = new Date(now)
  to.setHours(23, 59, 59, 999)
  const from = new Date(now)

  if (range === 'today') {
    from.setHours(0, 0, 0, 0)
  } else if (range === 'week') {
    from.setDate(now.getDate() - 7)
    from.setHours(0, 0, 0, 0)
  } else if (range === 'month') {
    from.setMonth(now.getMonth() - 1)
    from.setHours(0, 0, 0, 0)
  } else if (range === 'year') {
    from.setFullYear(now.getFullYear() - 1)
    from.setHours(0, 0, 0, 0)
  }

  return { from: from.toISOString(), to: to.toISOString() }
}

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<SaleRow[]>([])
  const [loading, setLoading] = useState(false)
  const [quickRange, setQuickRange] = useState<QuickRange>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => { load() }, [quickRange, customFrom, customTo])

  async function load() {
    setLoading(true)

    let from = '', to = ''
    if (quickRange === 'custom') {
      if (!customFrom || !customTo) { setLoading(false); return }
      from = new Date(customFrom).toISOString()
      to = new Date(customTo + 'T23:59:59').toISOString()
    } else {
      const range = getRange(quickRange)
      from = range.from
      to = range.to
    }

    // Load from local DB first (works offline)
    const localSales = await localDb.sales
      .where('created_at').between(from, to, true, true)
      .reverse()
      .toArray()

    if (localSales.length > 0) {
      const salesWithItems = await Promise.all(localSales.map(async s => {
        const items = await localDb.sale_items.where('sale_id').equals(s.id).toArray()
        return {
          id: s.id,
          receipt_number: s.receipt_number,
          total_amount: s.total_amount,
          payment_method: s.payment_method,
          created_at: s.created_at,
          cashier: s.cashier_name ? { full_name: s.cashier_name } : null,
          items: items.map(i => ({
            quantity: i.quantity,
            unit_price: i.unit_price,
            subtotal: i.subtotal,
            product: { name: i.product_name ?? '—', code: i.product_code ?? '—' }
          }))
        }
      }))
      setSales(salesWithItems as unknown as SaleRow[])
    }

    // Also sync from Supabase if online
    if (navigator.onLine) {
      const { data } = await supabase
        .from('sales')
        .select(`id, receipt_number, total_amount, payment_method, created_at,
          cashier:profiles(full_name),
          items:sale_items(quantity, unit_price, subtotal, product:products(name, code))`)
        .gte('created_at', from)
        .lte('created_at', to)
        .order('created_at', { ascending: false })
      if (data) setSales(data as unknown as SaleRow[])
    }

    setLoading(false)
  }

  // Filter by product name/code if searching
  const filtered = productSearch.trim()
    ? sales.filter(s =>
        s.items.some(i =>
          i.product?.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
          i.product?.code?.toLowerCase().includes(productSearch.toLowerCase())
        )
      )
    : sales

  const totalRevenue = filtered.reduce((s, x) => s + Number(x.total_amount), 0)
  const totalItems = filtered.reduce((s, x) => s + x.items.reduce((a, i) => a + i.quantity, 0), 0)

  const quickButtons: { label: string; value: QuickRange }[] = [
    { label: 'Today', value: 'today' },
    { label: 'Last 7 days', value: 'week' },
    { label: 'Last 30 days', value: 'month' },
    { label: 'This year', value: 'year' },
    { label: 'Custom', value: 'custom' },
  ]

  return (
    <AppShell>
      <div className="p-6 space-y-6">

        {/* Header with tabs */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-2xl font-bold text-slate-800">Sales</h1>
          </div>
          <div className="flex gap-2 mt-3">
            <Link href="/sales"
              className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:border-green-400 transition-colors">
              Record Sale
            </Link>
            <span className="px-4 py-2 rounded-xl text-sm font-medium bg-green-600 text-white">
              Sales History
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h3 className="font-semibold text-slate-700">Filter Sales</h3>

          {/* Quick range buttons */}
          <div className="flex flex-wrap gap-2">
            {quickButtons.map(btn => (
              <button key={btn.value} onClick={() => setQuickRange(btn.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                  quickRange === btn.value
                    ? 'bg-green-600 text-white border-green-600'
                    : 'border-slate-200 text-slate-600 hover:border-green-400'
                }`}>
                {btn.label}
              </button>
            ))}
          </div>

          {/* Custom date range */}
          {quickRange === 'custom' && (
            <div className="flex gap-3 flex-wrap">
              <div>
                <label className="block text-xs text-slate-500 mb-1">From</label>
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                  className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">To</label>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                  className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="flex items-end">
                <button onClick={load}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium">
                  Search
                </button>
              </div>
            </div>
          )}

          {/* Product search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input type="text" value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              placeholder="Filter by product name or code…"
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <p className="text-xs text-green-600 font-medium">Total Revenue</p>
            </div>
            <p className="text-2xl font-bold text-green-700">{totalRevenue.toLocaleString('en')} <span className="text-sm font-normal">FCFA</span></p>
          </div>
          <div className="bg-blue-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Receipt className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-blue-600 font-medium">Total Sales</p>
            </div>
            <p className="text-2xl font-bold text-blue-700">{filtered.length}</p>
          </div>
          <div className="bg-purple-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-purple-600" />
              <p className="text-xs text-purple-600 font-medium">Items Sold</p>
            </div>
            <p className="text-2xl font-bold text-purple-700">{totalItems}</p>
          </div>
        </div>

        {/* Sales list */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-700">{filtered.length} sale{filtered.length !== 1 ? 's' : ''} found</h3>
          </div>

          {loading ? (
            <div className="text-center py-16 text-slate-400">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>No sales found for this period</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(sale => (
                <div key={sale.id}>
                  {/* Sale row */}
                  <button onClick={() => setExpanded(expanded === sale.id ? null : sale.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 text-left transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          {sale.receipt_number}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${
                          sale.payment_method === 'cash' ? 'bg-green-100 text-green-700' :
                          sale.payment_method === 'card' ? 'bg-blue-100 text-blue-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {sale.payment_method}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(sale.created_at).toLocaleString()} · by {sale.cashier?.full_name ?? 'Unknown'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{Number(sale.total_amount).toLocaleString('en')} FCFA</p>
                      <p className="text-xs text-slate-400">{sale.items.length} item{sale.items.length !== 1 ? 's' : ''}</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expanded === sale.id ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Expanded items */}
                  {expanded === sale.id && (
                    <div className="bg-slate-50 border-t border-slate-100 px-5 py-3">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-slate-400 border-b border-slate-200">
                            <th className="text-left pb-2">Product</th>
                            <th className="text-center pb-2">Code</th>
                            <th className="text-center pb-2">Qty</th>
                            <th className="text-right pb-2">Unit Price</th>
                            <th className="text-right pb-2">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sale.items.map((item, i) => (
                            <tr key={i}>
                              <td className="py-2 font-medium text-slate-700">{item.product?.name ?? '—'}</td>
                              <td className="py-2 text-center">
                                <span className="font-mono text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                  {item.product?.code ?? '—'}
                                </span>
                              </td>
                              <td className="py-2 text-center">{item.quantity}</td>
                              <td className="py-2 text-right">{Number(item.unit_price).toLocaleString('en')} FCFA</td>
                              <td className="py-2 text-right font-semibold text-green-600">{Number(item.subtotal).toLocaleString('en')} FCFA</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-slate-200">
                            <td colSpan={4} className="pt-2 text-right font-semibold text-slate-700">Total</td>
                            <td className="pt-2 text-right font-bold text-green-700">{Number(sale.total_amount).toLocaleString('en')} FCFA</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
