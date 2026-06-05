'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/AppShell'
import { LogIn, ShoppingCart, Package, ArrowUp, Wallet, UserPlus, Trash2, Edit, Activity } from 'lucide-react'

interface Log {
  id: string
  action: string
  details: string
  created_at: string
  user: { full_name: string; role: string } | null
}

const actionConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  login:           { label: 'Login',           icon: LogIn,       color: 'bg-blue-100 text-blue-600' },
  sale_recorded:   { label: 'Sale',            icon: ShoppingCart, color: 'bg-green-100 text-green-600' },
  product_added:   { label: 'Product Added',   icon: Package,     color: 'bg-purple-100 text-purple-600' },
  product_edited:  { label: 'Product Edited',  icon: Edit,        color: 'bg-yellow-100 text-yellow-600' },
  product_deleted: { label: 'Product Deleted', icon: Trash2,      color: 'bg-red-100 text-red-600' },
  stock_received:  { label: 'Stock Received',  icon: ArrowUp,     color: 'bg-teal-100 text-teal-600' },
  expense_added:   { label: 'Expense',         icon: Wallet,      color: 'bg-orange-100 text-orange-600' },
  staff_added:     { label: 'Staff Added',     icon: UserPlus,    color: 'bg-indigo-100 text-indigo-600' },
  staff_deleted:   { label: 'Staff Removed',   icon: Trash2,      color: 'bg-red-100 text-red-600' },
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([])
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('activity_logs')
      .select('*, user:profiles(full_name, role)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (data) {
      setLogs(data as unknown as Log[])
      // Extract unique users
      const seen = new Set<string>()
      const uniqueUsers: { id: string; full_name: string }[] = []
      data.forEach((l: any) => {
        if (l.user_id && !seen.has(l.user_id)) {
          seen.add(l.user_id)
          uniqueUsers.push({ id: l.user_id, full_name: l.user?.full_name ?? 'Unknown' })
        }
      })
      setUsers(uniqueUsers)
    }
    setLoading(false)
  }

  const filtered = logs.filter(l => {
    const matchAction = filter === 'all' || l.action === filter
    const matchUser = userFilter === 'all' || (l as any).user_id === userFilter
    return matchAction && matchUser
  })

  // Group by date
  const grouped = filtered.reduce((acc, log) => {
    const date = new Date(log.created_at).toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    if (!acc[date]) acc[date] = []
    acc[date].push(log)
    return acc
  }, {} as Record<string, Log[]>)

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Activity Log</h1>
            <p className="text-slate-500 text-sm">Full history of all actions in the store</p>
          </div>
          <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-xl text-sm font-medium">
            <Activity className="w-4 h-4" />
            {filtered.length} entries
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="all">All Actions</option>
            {Object.entries(actionConfig).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
          <select value={userFilter} onChange={e => setUserFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="all">All Staff</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
        </div>

        {/* Logs grouped by date */}
        {loading ? (
          <div className="text-center py-16 text-slate-400">Loading activity…</div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Activity className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No activity recorded yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, dateLogs]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{date}</p>
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-400">{dateLogs.length} action{dateLogs.length !== 1 ? 's' : ''}</span>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                  {dateLogs.map(log => {
                    const config = actionConfig[log.action] ?? { label: log.action, icon: Activity, color: 'bg-slate-100 text-slate-600' }
                    const Icon = config.icon
                    return (
                      <div key={log.id} className="flex items-start gap-4 px-5 py-4">
                        <div className={`p-2 rounded-xl flex-shrink-0 ${config.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-800 text-sm">{log.user?.full_name ?? 'Unknown'}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              log.user?.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                            }`}>{log.user?.role ?? 'unknown'}</span>
                            <span className="text-xs text-slate-400">·</span>
                            <span className="text-xs font-medium text-slate-600">{config.label}</span>
                          </div>
                          <p className="text-sm text-slate-500 mt-0.5 truncate">{log.details}</p>
                        </div>
                        <p className="text-xs text-slate-400 flex-shrink-0">
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
