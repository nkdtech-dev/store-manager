'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/AppShell'
import { AlertTriangle, Plus, X, Package, ArrowUp, ArrowDown, History } from 'lucide-react'
import { logActivity } from '@/lib/activityLog'
import type { Product } from '@/types'
import Image from 'next/image'

export default function StockPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [tab, setTab] = useState<'low' | 'all' | 'log'>('low')
  const [movements, setMovements] = useState<any[]>([])
  const [showReceive, setShowReceive] = useState<Product | null>(null)
  const [receiveQty, setReceiveQty] = useState('')
  const [receiveNote, setReceiveNote] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: prods } = await supabase
      .from('products')
      .select('*, category:categories(id,name,description,created_at)')
      .order('stock_quantity')
    if (prods) setProducts(prods)

    const { data: moves } = await supabase
      .from('stock_movements')
      .select('*, product:products(name,code), created_by_profile:profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(50)
    if (moves) setMovements(moves)
  }

  async function receiveStock() {
    if (!showReceive || !receiveQty) return
    setSaving(true)
    const qty = Number(receiveQty)
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('stock_movements').insert({
      product_id: showReceive.id,
      type: 'received',
      quantity: qty,
      note: receiveNote || `Stock received`,
      created_by: user?.id
    })
    await supabase.from('products')
      .update({ stock_quantity: showReceive.stock_quantity + qty })
      .eq('id', showReceive.id)

    await logActivity('stock_received', `Received ${qty} ${showReceive.unit} of ${showReceive.name} (${showReceive.code})`)
    setShowReceive(null)
    setReceiveQty('')
    setReceiveNote('')
    load()
    setSaving(false)
  }

  const lowStock = products.filter(p => p.stock_quantity <= p.min_stock_level)
  const outOfStock = products.filter(p => p.stock_quantity === 0)

  function exportCSV() {
    const rows = [
      ['Code', 'Name', 'Category', 'Stock', 'Min Level', 'Status'],
      ...lowStock.map(p => [
        p.code, p.name, p.category?.name ?? '', p.stock_quantity, p.min_stock_level,
        p.stock_quantity === 0 ? 'OUT OF STOCK' : 'LOW STOCK'
      ])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `low-stock-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Stock Management</h1>
            <p className="text-slate-500 text-sm">{outOfStock.length} out of stock · {lowStock.length} low stock</p>
          </div>
          {tab === 'low' && lowStock.length > 0 && (
            <button onClick={exportCSV}
              className="border border-slate-300 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-xl text-sm font-medium">
              Export CSV
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { key: 'low', label: `Low Stock (${lowStock.length})` },
            { key: 'all', label: 'All Products' },
            { key: 'log', label: 'Movement Log' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-green-600 text-white' : 'border border-slate-200 text-slate-600 hover:border-green-400'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Low stock / All products */}
        {tab !== 'log' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Product</th>
                  <th className="text-center px-4 py-3 text-slate-500 font-medium">Stock</th>
                  <th className="text-center px-4 py-3 text-slate-500 font-medium">Min Level</th>
                  <th className="text-center px-4 py-3 text-slate-500 font-medium">Status</th>
                  <th className="text-center px-4 py-3 text-slate-500 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(tab === 'low' ? lowStock : products).map(p => {
                  const isOut = p.stock_quantity === 0
                  const isLow = p.stock_quantity <= p.min_stock_level
                  return (
                    <tr key={p.id} className={isOut ? 'bg-red-50' : isLow ? 'bg-orange-50' : ''}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                            {p.image_url
                              ? <Image src={p.image_url} alt={p.name} width={36} height={36} className="object-cover w-full h-full" />
                              : <Package className="w-4 h-4 text-slate-400" />
                            }
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{p.name}</p>
                            <p className="text-xs font-mono text-blue-600">{p.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-bold">
                        <span className={isOut ? 'text-red-600' : isLow ? 'text-orange-600' : 'text-slate-700'}>
                          {p.stock_quantity} {p.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500">{p.min_stock_level} {p.unit}</td>
                      <td className="px-4 py-3 text-center">
                        {isOut
                          ? <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">Out of Stock</span>
                          : isLow
                          ? <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">Low Stock</span>
                          : <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">OK</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => setShowReceive(p)}
                          className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg mx-auto transition-colors">
                          <Plus className="w-3 h-3" /> Receive Stock
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {(tab === 'low' ? lowStock : products).length === 0 && (
                  <tr><td colSpan={5} className="text-center py-12 text-slate-400">
                    {tab === 'low' ? '✅ All products are well stocked!' : 'No products found'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Movement log */}
        {tab === 'log' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="divide-y divide-slate-100">
              {movements.map(m => (
                <div key={m.id} className="flex items-center gap-4 px-5 py-3">
                  <div className={`p-2 rounded-xl ${
                    m.type === 'received' ? 'bg-green-100' :
                    m.type === 'sold' ? 'bg-blue-100' :
                    m.type === 'writeoff' ? 'bg-red-100' : 'bg-slate-100'
                  }`}>
                    {m.type === 'received' ? <ArrowUp className="w-4 h-4 text-green-600" /> :
                     m.type === 'sold' ? <ArrowDown className="w-4 h-4 text-blue-600" /> :
                     <History className="w-4 h-4 text-slate-500" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{m.product?.name ?? '—'}</p>
                    <p className="text-xs text-slate-400">{m.note} · {new Date(m.created_at).toLocaleString()}</p>
                  </div>
                  <span className={`font-bold text-sm ${m.quantity > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {m.quantity > 0 ? '+' : ''}{m.quantity}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full capitalize font-medium ${
                    m.type === 'received' ? 'bg-green-100 text-green-700' :
                    m.type === 'sold' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>{m.type}</span>
                </div>
              ))}
              {movements.length === 0 && <p className="text-center py-12 text-slate-400 text-sm">No stock movements yet</p>}
            </div>
          </div>
        )}
      </div>

      {/* Receive Stock Modal */}
      {showReceive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Receive Stock</h3>
              <button onClick={() => setShowReceive(null)} className="p-1 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="font-medium text-slate-800">{showReceive.name}</p>
              <p className="text-sm text-slate-500">Current stock: <span className="font-bold">{showReceive.stock_quantity} {showReceive.unit}</span></p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantity Received *</label>
              <input autoFocus type="number" min="1" value={receiveQty}
                onChange={e => setReceiveQty(e.target.value)}
                placeholder="Enter quantity"
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              {receiveQty && (
                <p className="text-xs text-green-600 mt-1">New stock will be: {showReceive.stock_quantity + Number(receiveQty)} {showReceive.unit}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Note</label>
              <input value={receiveNote} onChange={e => setReceiveNote(e.target.value)}
                placeholder="e.g. Supplier delivery"
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowReceive(null)}
                className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-xl text-sm font-medium">Cancel</button>
              <button onClick={receiveStock} disabled={!receiveQty || saving}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold">
                {saving ? 'Saving…' : 'Confirm Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
