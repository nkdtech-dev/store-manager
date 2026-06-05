'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { Plus, Edit, Trash2, X, User, ShieldCheck, Users } from 'lucide-react'
import type { Profile } from '@/types'

const emptyForm = { username: '', full_name: '', password: '', role: 'cashier' as 'admin' | 'cashier' }

export default function StaffPage() {
  const [staff, setStaff] = useState<Profile[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Profile | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadStaff() }, [])

  async function loadStaff() {
    setLoading(true)
    const res = await fetch('/api/staff')
    const data = await res.json()
    if (res.ok) {
      setStaff(data)
    } else {
      setError(data.error ?? 'Failed to load staff')
    }
    setLoading(false)
  }

  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setShowForm(true)
  }

  function openEdit(p: Profile) {
    setEditing(p)
    // Extract username from email (remove @ndastore.app)
    const username = p.email.replace('@ndastore.app', '')
    setForm({ username, full_name: p.full_name, password: '', role: p.role })
    setError('')
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      if (editing) {
        const res = await fetch('/api/staff', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editing.id, full_name: form.full_name, role: form.role }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error); return }
      } else {
        const res = await fetch('/api/staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error); return }
      }

      setShowForm(false)
      loadStaff()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(member: Profile) {
    if (!confirm(`Remove ${member.full_name} from the system?`)) return
    const res = await fetch('/api/staff', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: member.id }),
    })
    if (res.ok) loadStaff()
  }

  const admins = staff.filter(s => s.role === 'admin')
  const cashiers = staff.filter(s => s.role === 'cashier')

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Staff Management</h1>
            <p className="text-slate-500 text-sm">{staff.length} team members</p>
          </div>
          <button onClick={openNew}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" /> Add Staff
          </button>
        </div>

        {error && !showForm && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}
        {loading ? (
          <div className="text-center py-16 text-slate-400">Loading staff…</div>
        ) : (
          <div className="space-y-6">
            {/* Admins */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-slate-700">Admins ({admins.length})</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {admins.map(member => (
                  <StaffCard key={member.id} member={member} onEdit={openEdit} onDelete={handleDelete} />
                ))}
              </div>
            </div>

            {/* Cashiers */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-green-600" />
                <h2 className="font-semibold text-slate-700">Cashiers ({cashiers.length})</h2>
              </div>
              {cashiers.length === 0 ? (
                <p className="text-slate-400 text-sm">No cashiers yet. Add one above.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cashiers.map(member => (
                    <StaffCard key={member.id} member={member} onEdit={openEdit} onDelete={handleDelete} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-slate-800">
                {editing ? 'Edit Staff Member' : 'Add New Staff'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                <input required value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="e.g. John Doe"
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>

              {!editing && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Username *</label>
                  <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-green-500">
                    <span className="px-3 py-2.5 bg-slate-50 text-slate-400 text-sm border-r border-slate-300">@</span>
                    <input required value={form.username}
                      onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, '') }))}
                      placeholder="johndoe"
                      className="flex-1 px-3 py-2.5 text-sm focus:outline-none" />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">They will log in with this username</p>
                </div>
              )}

              {!editing && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                  <input required type="password" value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Min. 6 characters"
                    minLength={6}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['cashier', 'admin'] as const).map(r => (
                    <button key={r} type="button" onClick={() => setForm(f => ({ ...f, role: r }))}
                      className={`py-3 rounded-xl text-sm font-medium border-2 transition-colors capitalize flex items-center justify-center gap-2 ${
                        form.role === r
                          ? r === 'admin' ? 'bg-blue-600 text-white border-blue-600' : 'bg-green-600 text-white border-green-600'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}>
                      {r === 'admin' ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      {r}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {form.role === 'admin' ? '⚠ Admins can manage products, staff and view all reports.' : 'Cashiers can record sales and view inventory.'}
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold">
                  {saving ? 'Saving…' : editing ? 'Update' : 'Create Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  )
}

function StaffCard({ member, onEdit, onDelete }: {
  member: Profile
  onEdit: (m: Profile) => void
  onDelete: (m: Profile) => void
}) {
  const username = member.email.replace('@ndastore.app', '')
  const initials = member.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
        member.role === 'admin' ? 'bg-blue-600' : 'bg-green-600'
      }`}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 truncate">{member.full_name}</p>
        <p className="text-sm text-slate-400 truncate">@{username}</p>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          member.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
        }`}>
          {member.role}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <button onClick={() => onEdit(member)}
          className="p-1.5 hover:bg-blue-50 text-blue-500 rounded-lg transition-colors">
          <Edit className="w-4 h-4" />
        </button>
        <button onClick={() => onDelete(member)}
          className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
