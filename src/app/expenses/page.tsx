'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/AppShell'
import { Plus, Trash2, X, DollarSign, Download } from 'lucide-react'
import { logActivity } from '@/lib/activityLog'
import { localDb } from '@/lib/localDb'
import type { Expense } from '@/types'

const EXPENSE_CATEGORIES = ['Rent', 'Utilities', 'Salaries', 'Supplies', 'Transport', 'Maintenance', 'Marketing', 'General']

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ description: '', amount: '', category: 'General' })
  const [saving, setSaving] = useState(false)
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7))
  const supabase = createClient()

  useEffect(() => { load() }, [monthFilter])

  async function load() {
    const from = new Date(monthFilter + '-01').toISOString()
    const to = new Date(new Date(monthFilter + '-01').setMonth(new Date(monthFilter + '-01').getMonth() + 1)).toISOString()

    // Load from local DB first
    const localExpenses = await localDb.expenses
      .where('created_at').between(from, to, true, false)
      .reverse().toArray()
    if (localExpenses.length > 0) setExpenses(localExpenses as any)

    // Sync from Supabase if online
    if (navigator.onLine) {
      const { data } = await supabase.from('expenses').select('*')
        .gte('created_at', from).lt('created_at', to)
        .order('created_at', { ascending: false })
      if (data) setExpenses(data)
    }
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('expenses').insert({
      description: form.description.trim(),
      amount: Number(form.amount),
      category: form.category,
      recorded_by: user?.id
    })
    await logActivity('expense_added', `Added expense: ${form.description} — ${form.amount} FCFA (${form.category})`)
    setForm({ description: '', amount: '', category: 'General' })
    setShowForm(false)
    load()
    setSaving(false)
  }

  async function deleteExpense(id: string) {
    if (!confirm('Delete this expense?')) return
    await supabase.from('expenses').delete().eq('id', id)
    load()
  }

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const byCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount)
    return acc
  }, {} as Record<string, number>)

  function exportCSV() {
    const rows = [['Date', 'Description', 'Category', 'Amount (FCFA)'],
      ...expenses.map(e => [new Date(e.created_at).toLocaleDateString(), e.description, e.category, e.amount])]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `expenses-${monthFilter}.csv`; a.click()
  }

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Expenses</h1>
            <p className="text-slate-500 text-sm">Track store costs to see real profit</p>
          </div>
          <div className="flex gap-2">
            <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            <button onClick={exportCSV}
              className="border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-2 rounded-xl text-sm flex items-center gap-1">
              <Download className="w-4 h-4" /> Export
            </button>
            <button onClick={() => setShowForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Expense
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-red-50 rounded-2xl p-4 col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-red-600" />
              <p className="text-xs text-red-600 font-medium">Total Expenses</p>
            </div>
            <p className="text-2xl font-bold text-red-700">{totalExpenses.toLocaleString('en')} <span className="text-sm font-normal">FCFA</span></p>
          </div>
          {Object.entries(byCategory).slice(0, 3).map(([cat, amt]) => (
            <div key={cat} className="bg-slate-50 rounded-2xl p-4">
              <p className="text-xs text-slate-500 font-medium mb-1">{cat}</p>
              <p className="text-xl font-bold text-slate-700">{amt.toLocaleString('en')} <span className="text-xs font-normal">FCFA</span></p>
            </div>
          ))}
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
            <h3 className="font-semibold text-slate-700">{expenses.length} expense{expenses.length !== 1 ? 's' : ''} this month</h3>
          </div>
          {expenses.length === 0 ? (
            <p className="text-center py-12 text-slate-400 text-sm">No expenses recorded for this month</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {expenses.map(exp => (
                <div key={exp.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{exp.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{exp.category}</span>
                      <span className="text-xs text-slate-400">{new Date(exp.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <p className="font-bold text-red-600">{Number(exp.amount).toLocaleString('en')} FCFA</p>
                  <button onClick={() => deleteExpense(exp.id)}
                    className="p-1.5 hover:bg-red-50 text-red-400 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Add Expense</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={addExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                <input required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Electricity bill"
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount (FCFA) *</label>
                <input required type="number" min="1" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0"
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-xl text-sm font-medium">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold">
                  {saving ? 'Saving…' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  )
}
