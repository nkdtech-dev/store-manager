'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/AppShell'
import ProductPopup from '@/components/ProductPopup'
import { Search, Plus, Minus, Trash2, Receipt, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import type { Product, Sale } from '@/types'

interface CartItem { product: Product; quantity: number }

export default function SalesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [showResults, setShowResults] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); setShowResults(false); return }
    const q = search.toLowerCase()
    const results = products.filter(p =>
      p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
    ).slice(0, 6)
    setSearchResults(results)
    setShowResults(true)
  }, [search, products])

  async function loadData() {
    const { data: prods } = await supabase
      .from('products')
      .select('*, category:categories(id,name,description,created_at)')
      .gt('stock_quantity', 0)
      .order('name')
    if (prods) setProducts(prods)

    const { data: sales } = await supabase
      .from('sales')
      .select('*, cashier:profiles(id,email,full_name,role,created_at)')
      .order('created_at', { ascending: false })
      .limit(10)
    if (sales) setRecentSales(sales)
  }

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        return prev.map(i => i.product.id === product.id
          ? { ...i, quantity: Math.min(i.quantity + 1, product.stock_quantity) }
          : i
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
    setSearch('')
    setShowResults(false)
  }

  function updateQty(id: string, qty: number) {
    if (qty <= 0) { setCart(prev => prev.filter(i => i.product.id !== id)); return }
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, quantity: Math.min(qty, i.product.stock_quantity) } : i))
  }

  const total = cart.reduce((s, i) => s + i.product.selling_price * i.quantity, 0)

  async function handleSale() {
    if (cart.length === 0) return
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const receiptNumber = `RCP-${Date.now()}`

      const { data: sale, error } = await supabase
        .from('sales')
        .insert({ receipt_number: receiptNumber, cashier_id: user?.id, total_amount: total, payment_method: paymentMethod, notes: notes || null })
        .select()
        .single()

      if (error || !sale) throw error

      const saleItems = cart.map(i => ({
        sale_id: sale.id,
        product_id: i.product.id,
        quantity: i.quantity,
        unit_price: i.product.selling_price,
        subtotal: i.product.selling_price * i.quantity
      }))
      await supabase.from('sale_items').insert(saleItems)

      // Decrement stock
      for (const item of cart) {
        await supabase
          .from('products')
          .update({ stock_quantity: item.product.stock_quantity - item.quantity })
          .eq('id', item.product.id)
      }

      setCart([])
      setNotes('')
      loadData()
      alert(`Sale recorded! Receipt: ${receiptNumber}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell>
      <div className="p-6 h-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Sales</h1>
          <div className="flex gap-2 mt-3">
            <span className="px-4 py-2 rounded-xl text-sm font-medium bg-green-600 text-white">
              Record Sale
            </span>
            <Link href="/sales/history"
              className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:border-green-400 transition-colors">
              Sales History
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Search + Recent */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search */}
            <div ref={searchRef} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by product code or name…"
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
                />
              </div>
              {showResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-10 overflow-hidden">
                  {searchResults.map(p => (
                    <button key={p.id} onClick={() => addToCart(p)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-green-50 text-left border-b border-slate-100 last:border-0 transition-colors">
                      <div>
                        <span className="text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{p.code}</span>
                        <p className="font-medium text-slate-800 mt-0.5">{p.name}</p>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="font-bold text-green-600 text-sm">{p.selling_price.toLocaleString('en')} FCFA</p>
                        <p className="text-xs text-slate-400">Stock: {p.stock_quantity}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cart */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <h3 className="font-semibold text-slate-700">Cart ({cart.length} items)</h3>
              </div>
              {cart.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p>Cart is empty. Search a product above.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex items-center gap-4 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <button onClick={() => setSelectedProduct(item.product)} className="text-left">
                          <p className="font-medium text-slate-800 hover:text-green-600 truncate">{item.product.name}</p>
                          <p className="text-xs text-slate-500">{item.product.selling_price.toLocaleString('en')} FCFA each</p>
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(item.product.id, item.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center border border-slate-300 rounded-lg hover:bg-slate-100">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                        <button onClick={() => updateQty(item.product.id, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center border border-slate-300 rounded-lg hover:bg-slate-100">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="w-28 text-right">
                        <p className="font-bold text-green-600">{(item.product.selling_price * item.quantity).toLocaleString('en')} FCFA</p>
                      </div>
                      <button onClick={() => setCart(c => c.filter(i => i.product.id !== item.product.id))}
                        className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Sales */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <h3 className="font-semibold text-slate-700">Recent Sales</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {recentSales.map(sale => (
                  <div key={sale.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium font-mono text-blue-600">{sale.receipt_number}</p>
                      <p className="text-xs text-slate-400">{new Date(sale.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{Number(sale.total_amount).toLocaleString('en')} FCFA</p>
                      <p className="text-xs text-slate-400 capitalize">{sale.payment_method}</p>
                    </div>
                  </div>
                ))}
                {recentSales.length === 0 && (
                  <p className="text-center py-8 text-slate-400 text-sm">No sales yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Checkout */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 sticky top-6">
              <h3 className="font-bold text-slate-800 text-lg">Checkout</h3>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['cash', 'card', 'transfer'] as const).map(m => (
                    <button key={m} onClick={() => setPaymentMethod(m)}
                      className={`py-2 rounded-xl text-sm font-medium border transition-colors capitalize ${
                        paymentMethod === m ? 'bg-green-600 text-white border-green-600' : 'border-slate-200 text-slate-600 hover:border-green-400'
                      }`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  rows={2} placeholder="Optional notes…"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
              </div>

              <div className="border-t border-slate-200 pt-4">
                <div className="flex justify-between text-sm text-slate-500 mb-1">
                  <span>Subtotal</span>
                  <span>{total.toLocaleString('en')} FCFA</span>
                </div>
                <div className="flex justify-between font-bold text-xl text-slate-800">
                  <span>Total</span>
                  <span className="text-green-600">{total.toLocaleString('en')} FCFA</span>
                </div>
              </div>

              <button onClick={handleSale} disabled={cart.length === 0 || submitting}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-colors text-base">
                {submitting ? 'Processing…' : `Confirm Sale`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedProduct && (
        <ProductPopup product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </AppShell>
  )
}
