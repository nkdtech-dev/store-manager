'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingCart, BarChart3, LogOut, Store, Users, Clock, AlertTriangle, Wallet, Settings, Activity } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Profile } from '@/types'

// Nav items visible to all users
const cashierNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/sales', label: 'Sales', icon: ShoppingCart },
  { href: '/stock', label: 'Stock', icon: AlertTriangle },
]

// Extra nav items only for admins
const adminNav = [
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/expenses', label: 'Expenses', icon: Wallet },
  { href: '/activity', label: 'Activity Log', icon: Activity },
  { href: '/staff', label: 'Staff', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (data) setProfile(data)
    }
    loadProfile()
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-64 bg-green-800 text-white flex flex-col min-h-screen">
      <div className="p-6 border-b border-green-700">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-lg p-2">
            <Store className="text-green-700 w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-lg leading-tight">NDA Store</p>
            <p className="text-green-300 text-xs">Inventory & Sales</p>
          </div>
        </div>
      </div>

      {/* Logged in user info */}
      {profile && (
        <div className="px-4 py-3 border-b border-green-700 bg-green-900/30">
          <div className="flex items-center gap-3 mb-1">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
              profile.role === 'admin' ? 'bg-blue-500' : 'bg-green-500'
            }`}>
              {profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-bold truncate">{profile.full_name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                profile.role === 'admin' ? 'bg-blue-500/40 text-blue-200' : 'bg-green-500/40 text-green-200'
              }`}>
                {profile.role}
              </span>
            </div>
          </div>
          {profile.last_login_at && (
            <div className="flex items-center gap-1 mt-1.5">
              <Clock className="w-3 h-3 text-green-400" />
              <p className="text-green-400 text-xs">
                Last login: {new Date(profile.last_login_at).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      )}

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {/* All users see cashier nav */}
        {cashierNav.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
                active ? 'bg-green-600 text-white' : 'text-green-200 hover:bg-green-700 hover:text-white'
              }`}>
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          )
        })}

        {/* Admin-only section */}
        {profile?.role === 'admin' && (
          <>
            <div className="pt-3 pb-1">
              <p className="text-xs text-green-500 font-semibold uppercase tracking-wider px-4">Admin</p>
            </div>
            {adminNav.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href)
              return (
                <Link key={href} href={href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
                    active ? 'bg-green-600 text-white' : 'text-green-200 hover:bg-green-700 hover:text-white'
                  }`}>
                  <Icon className="w-5 h-5" />
                  {label}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      <div className="p-4 border-t border-green-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-green-200 hover:bg-green-700 hover:text-white transition-colors text-sm font-medium w-full"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </aside>
  )
}
