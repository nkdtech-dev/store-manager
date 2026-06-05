'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/AppShell'
import Receipt from '@/components/Receipt'
import { Search, Plus, Minus, Trash2, Tag } from 'lucide-react'
import { logActivity } from '@/lib/activityLog'
import { queueSync } from '@/lib/sync'
import { localDb } from '@/lib/localDb'
import type { Product, Sale } from '@/types'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface CartItem { product: Product; quantity: number; discount: number }

function SalesPageInner() {
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [showResults, setShowResults] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'momo'>('cash')
  const [cartDiscount, setCartDiscount] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [receipt, setReceipt] = useState<React.ComponentProps<typeof Receipt> | null>(null)
  const [cashierName, setCashierName] = useState('')
  const supabase = createClient()
  const searchParams = useSearchParams()

  useEffect(() => { loadData() }, [])

  // Auto-add product from dashboard popup
  useEffect(() => {
    const code = searchParams.get('add')
    if (!code || products.length === 0) return
    const product = products.find(p => p.code.toLowerCase() === code.toLowerCase())
    if (product) addToCart(product)
  }, [products, searchParams])

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

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      if (profile) setCashierName(profile.full_name)
    }

    const { data: sales } = await supabase
      .from('sales')
      .select('*, cashier:profiles(id,email,full_name,role,created_at)')
      .order('created_at', { ascending: false })
      .limit(8)
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
      return [...prev, { product, quantity: 1, discount: 0 }]
    })
    setSearch('')
    setShowResults(false)
  }

  function updateQty(id: string, qty: number) {
    if (qty <= 0) { setCart(prev => prev.filter(i => i.product.id !== id)); return }
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, quantity: Math.min(qty, i.product.stock_quantity) } : i))
  }

  function updateDiscount(id: string, discount: number) {
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, discount: Math.max(0, discount) } : i))
  }

  const subtotal = cart.reduce((s, i) => s + i.product.selling_price * i.quantity - i.discount, 0)
  const cartDiscountNum = Number(cartDiscount) || 0
  const total = Math.max(0, subtotal - cartDiscountNum)

  async function handleSale() {
    if (cart.length === 0) return
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const receiptNumber = `RCP-${Date.now()}`

      const saleId = crypto.randomUUID()
      const saleData = {
        id: saleId,
        receipt_number: receiptNumber,
        cashier_id: user?.id,
        total_amount: total,
        discount: cartDiscountNum,
        payment_method: paymentMethod,
        notes: notes || null,
        created_at: new Date().toISOString(),
      }

      const saleItems = cart.map(i => ({
        id: crypto.randomUUID(),
        sale_id: saleId,
        product_id: i.product.id,
        quantity: i.quantity,
        unit_price: i.product.selling_price,
        discount: i.discount,
        subtotal: i.product.selling_price * i.quantity - i.discount,
        created_at: new Date().toISOString(),
      }))

      if (navigator.onLine) {
        // Online: write directly to Supabase
        const { error } = await supabase.from('sales').insert(saleData)
        if (error) throw error
        await supabase.from('sale_items').insert(saleItems)
        for (const item of cart) {
          await supabase.from('products')
            .update({ stock_quantity: item.product.stock_quantity - item.quantity })
            .eq('id', item.product.id)
          await supabase.from('stock_movements').insert({
            product_id: item.product.id, type: 'sold',
            quantity: -item.quantity, note: `Sale ${receiptNumber}`, created_by: user?.id
          })
        }
      } else {
        // Offline: queue for later sync
        await queueSync('insert', 'sales', saleData)
        for (const item of saleItems) await queueSync('insert', 'sale_items', item)
        for (const item of cart) {
          const newQty = item.product.stock_quantity - item.quantity
          await queueSync('update', 'products', { id: item.product.id, stock_quantity: newQty })
          await queueSync('insert', 'stock_movements', {
            id: crypto.randomUUID(), product_id: item.product.id, type: 'sold',
            quantity: -item.quantity, note: `Sale ${receiptNumber}`, created_by: user?.id,
            created_at: new Date().toISOString(),
          })
        }
      }

      // Always update local DB stock immediately
      for (const item of cart) {
        await localDb.products.update(item.product.id, {
          stock_quantity: item.product.stock_quantity - item.quantity
        })
      }

      await logActivity('sale_recorded', `Sale ${receiptNumber} — ${cart.length} item(s) — ${total.toLocaleString('en')} FCFA (${paymentMethod})`)

      // Show receipt only if enabled in settings
      const settings = JSON.parse(localStorage.getItem('store_settings') || '{}')
      const receiptEnabled = settings.receiptEnabled !== false // default true
      if (!receiptEnabled) { setCart([]); setNotes(''); setCartDiscount(''); loadData(); return }

      setReceipt({
        receiptNumber,
        items: cart.map(i => ({
          name: i.product.name,
          code: i.product.code,
          quantity: i.quantity,
          unit_price: i.product.selling_price,
          discount: i.discount,
          subtotal: i.product.selling_price * i.quantity - i.discount
        })),
        total,
        discount: cartDiscountNum,
        paymentMethod,
        cashierName,
        onClose: () => { setReceipt(null); loadData() }
      })

      setCart([])
      setNotes('')
      setCartDiscount('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell>
      <div className="p-4 md:p-6 h-full">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-slate-800">Sales</h1>
          <div className="flex gap-2 mt-3">
            <span className="px-4 py-2 rounded-xl text-sm font-medium bg-green-600 text-white">Record Sale</span>
            <Link href="/sales/history"
              className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:border-green-400 transition-colors">
              Sales History
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by product code or name…"
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
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
                <div className="text-center py-10 text-slate-400">
                  <p className="text-sm">Cart is empty. Search a product above.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {cart.map(item => (
                    <div key={item.product.id} className="px-4 py-3 space-y-2">
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 truncate">{item.product.name}</p>
                          <p className="text-xs text-slate-500">{item.product.selling_price.toLocaleString('en')} FCFA each</p>
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
                          <p className="font-bold text-green-600 text-sm">
                            {(item.product.selling_price * item.quantity - item.discount).toLocaleString('en')} FCFA
                          </p>
                        </div>
                        <button onClick={() => setCart(c => c.filter(i => i.product.id !== item.product.id))}
                          className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {/* Per-item discount */}
                      <div className="flex items-center gap-2 pl-0">
                        <Tag className="w-3 h-3 text-slate-400" />
                        <input
                          type="number" min="0"
                          placeholder="Item discount (FCFA)"
                          value={item.discount || ''}
                          onChange={e => updateDiscount(item.product.id, Number(e.target.value))}
                          className="w-44 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500 text-slate-600"
                        />
                        {item.discount > 0 && (
                          <span className="text-xs text-red-500 font-medium">-{item.discount.toLocaleString('en')} FCFA off</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Sales */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-semibold text-slate-700">Recent Sales</h3>
                <Link href="/sales/history" className="text-xs text-green-600 hover:underline">View all →</Link>
              </div>
              <div className="divide-y divide-slate-100">
                {recentSales.map(sale => (
                  <div key={sale.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-mono font-medium text-blue-600">{sale.receipt_number}</p>
                      <p className="text-xs text-slate-400">{new Date(sale.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600 text-sm">{Number(sale.total_amount).toLocaleString('en')} FCFA</p>
                      <p className="text-xs text-slate-400 capitalize">{sale.payment_method}</p>
                    </div>
                  </div>
                ))}
                {recentSales.length === 0 && <p className="text-center py-6 text-slate-400 text-sm">No sales yet</p>}
              </div>
            </div>
          </div>

          {/* Checkout */}
          <div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 sticky top-6">
              <h3 className="font-bold text-slate-800 text-lg">Checkout</h3>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['cash', 'momo'] as const).map(m => (
                    <button key={m} onClick={() => setPaymentMethod(m)}
                      className={`py-2 rounded-xl text-sm font-medium border transition-colors capitalize ${
                        paymentMethod === m ? 'bg-green-600 text-white border-green-600' : 'border-slate-200 text-slate-600 hover:border-green-400'
                      }`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cart-level discount */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cart Discount (FCFA)</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input type="number" min="0" value={cartDiscount}
                    onChange={e => setCartDiscount(e.target.value)}
                    placeholder="0"
                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  rows={2} placeholder="Optional notes…"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
              </div>

              <div className="border-t border-slate-200 pt-4 space-y-1">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span>{subtotal.toLocaleString('en')} FCFA</span>
                </div>
                {cartDiscountNum > 0 && (
                  <div className="flex justify-between text-sm text-red-500">
                    <span>Cart Discount</span>
                    <span>-{cartDiscountNum.toLocaleString('en')} FCFA</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xl text-slate-800">
                  <span>Total</span>
                  <span className="text-green-600">{total.toLocaleString('en')} FCFA</span>
                </div>
              </div>

              <button onClick={handleSale} disabled={cart.length === 0 || submitting}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-colors text-base">
                {submitting ? 'Processing…' : 'Confirm Sale'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {receipt && <Receipt {...receipt} />}
    </AppShell>
  )
}

export default function SalesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-slate-400">Loading…</div>}>
      <SalesPageInner />
    </Suspense>
  )
}
