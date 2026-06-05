'use client'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Menu, X } from 'lucide-react'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [lowStockCount, setLowStockCount] = useState(0)

  useEffect(() => {
    async function checkStock() {
      const supabase = createClient()
      const { data } = await supabase.from('products').select('stock_quantity, min_stock_level')
      if (data) setLowStockCount(data.filter(p => p.stock_quantity <= p.min_stock_level).length)
    }
    checkStock()
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 flex flex-col w-72">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto scrollbar-thin pb-20 md:pb-0">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-30 bg-white border-b border-slate-200 flex items-center gap-3 px-4 py-3">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-slate-100 -ml-2">
            <Menu className="w-6 h-6 text-slate-700" />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-green-700 rounded-lg p-1.5">
              <span className="text-white text-xs font-bold">NDA</span>
            </div>
            <span className="font-bold text-slate-800">NDA Store</span>
          </div>
        </div>

        {children}
      </main>

      {/* Mobile bottom nav */}
      <BottomNav lowStockCount={lowStockCount} />
    </div>
  )
}
