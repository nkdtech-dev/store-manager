'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/AppShell'
import ProductPopup from '@/components/ProductPopup'
import { Plus, Search, Edit, Trash2, Package, Upload, X, Tag } from 'lucide-react'
import type { Product, Category } from '@/types'
import Image from 'next/image'

const UNITS = ['pcs', 'kg', 'L', 'm', 'm²', 'box', 'roll', 'bag', 'set']

const emptyForm = {
  code: '', name: '', description: '', category_id: '',
  cost_price: '', selling_price: '', stock_quantity: '', min_stock_level: '5', unit: 'pcs'
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<Product | null>(null)
  const [similarProducts, setSimilarProducts] = useState<Product[]>([])
  const [showCatForm, setShowCatForm] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [savingCat, setSavingCat] = useState(false)
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: prods } = await supabase
      .from('products')
      .select('*, category:categories(id,name,description,created_at)')
      .order('name')
    const { data: cats } = await supabase.from('categories').select('*').order('name')
    if (prods) setProducts(prods)
    if (cats) setCategories(cats)
  }

  async function addCategory() {
    if (!newCatName.trim()) return
    setSavingCat(true)
    const { data } = await supabase
      .from('categories')
      .insert({ name: newCatName.trim() })
      .select()
      .single()
    if (data) {
      setCategories(prev => [...prev, data])
      setForm(f => ({ ...f, category_id: data.id }))
      setNewCatName('')
      setShowCatForm(false)
    }
    setSavingCat(false)
  }

  const filtered = products.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
    const matchCat = !filterCat || p.category_id === filterCat
    return matchSearch && matchCat
  })

  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setImageFile(null)
    setImagePreview('')
    setShowForm(true)
  }

  function openEdit(p: Product) {
    setEditing(p)
    setForm({
      code: p.code, name: p.name, description: p.description ?? '',
      category_id: p.category_id ?? '', cost_price: String(p.cost_price),
      selling_price: String(p.selling_price), stock_quantity: String(p.stock_quantity),
      min_stock_level: String(p.min_stock_level), unit: p.unit
    })
    setImageFile(null)
    setImagePreview(p.image_url ?? '')
    setShowForm(true)
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      let image_url = editing?.image_url ?? null
      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        const path = `products/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('product-images').upload(path, imageFile, { upsert: true })
        if (!uploadError) {
          const { data } = supabase.storage.from('product-images').getPublicUrl(path)
          image_url = data.publicUrl
        }
      }

      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        category_id: form.category_id || null,
        cost_price: Number(form.cost_price),
        selling_price: Number(form.selling_price),
        stock_quantity: Number(form.stock_quantity),
        min_stock_level: Number(form.min_stock_level),
        unit: form.unit,
        image_url,
      }

      if (editing) {
        await supabase.from('products').update(payload).eq('id', editing.id)
      } else {
        await supabase.from('products').insert(payload)
      }

      setShowForm(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this product?')) return
    await supabase.from('products').delete().eq('id', id)
    load()
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

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Inventory</h1>
            <p className="text-slate-500 text-sm">{products.length} products total</p>
          </div>
          <button onClick={openNew} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search products…"
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <select
            value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Product</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Category</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">Cost</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">Price</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">Stock</th>
                  <th className="text-center px-4 py-3 text-slate-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(p => {
                  const isLow = p.stock_quantity <= p.min_stock_level
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <button onClick={() => openProduct(p)} className="flex items-center gap-3 text-left">
                          <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {p.image_url
                              ? <Image src={p.image_url} alt={p.name} width={40} height={40} className="object-cover w-full h-full" />
                              : <Package className="w-5 h-5 text-slate-400" />
                            }
                          </div>
                          <div>
                            <p className="font-medium text-slate-800 hover:text-green-600">{p.name}</p>
                            <p className="text-xs font-mono text-blue-600">{p.code}</p>
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{p.category?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{p.cost_price.toLocaleString('en')} FCFA</td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600">{p.selling_price.toLocaleString('en')} FCFA</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${isLow ? 'text-red-600' : 'text-slate-700'}`}>
                          {p.stock_quantity} {p.unit}
                        </span>
                        {isLow && <span className="ml-1 text-xs text-red-400">⚠</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-blue-50 text-blue-500 rounded-lg transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-slate-400">
                      <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      No products found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-slate-800">{editing ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Product Code *</label>
                  <input required value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    placeholder="e.g. EL-001" className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unit *</label>
                  <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Product Name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Full product name" className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700">Category</label>
                  <button type="button" onClick={() => setShowCatForm(v => !v)}
                    className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium">
                    <Tag className="w-3 h-3" /> + New Category
                  </button>
                </div>
                {showCatForm && (
                  <div className="flex gap-2 mb-2">
                    <input
                      autoFocus
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                      placeholder="Category name"
                      className="flex-1 border border-green-400 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button type="button" onClick={addCategory} disabled={savingCat}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-xl text-sm font-medium disabled:opacity-60">
                      {savingCat ? '…' : 'Add'}
                    </button>
                    <button type="button" onClick={() => { setShowCatForm(false); setNewCatName('') }}
                      className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} placeholder="Optional description"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cost Price (FCFA) *</label>
                  <input required type="number" min="0" step="any" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Selling Price (FCFA) *</label>
                  <input required type="number" min="0" step="any" value={form.selling_price} onChange={e => setForm(f => ({ ...f, selling_price: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stock Quantity *</label>
                  <input required type="number" min="0" value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Min Stock Alert</label>
                  <input type="number" min="0" value={form.min_stock_level} onChange={e => setForm(f => ({ ...f, min_stock_level: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Product Image</label>
                <div className="flex items-center gap-4">
                  {imagePreview && (
                    <Image src={imagePreview} alt="preview" width={64} height={64} className="rounded-xl object-cover w-16 h-16 border" />
                  )}
                  <label className="flex items-center gap-2 border-2 border-dashed border-slate-300 hover:border-green-500 rounded-xl px-4 py-3 cursor-pointer transition-colors text-sm text-slate-500">
                    <Upload className="w-4 h-4" />
                    Upload image
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                  {saving ? 'Saving…' : editing ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selected && (
        <ProductPopup product={selected} similarProducts={similarProducts} onClose={() => setSelected(null)} />
      )}
    </AppShell>
  )
}
