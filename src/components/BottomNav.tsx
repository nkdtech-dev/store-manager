'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingCart, AlertTriangle, Settings } from 'lucide-react'

const mobileNav = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/inventory', label: 'Stock', icon: Package },
  { href: '/sales', label: 'Sales', icon: ShoppingCart },
  { href: '/stock', label: 'Restock', icon: AlertTriangle },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function BottomNav({ lowStockCount = 0 }: { lowStockCount?: number }) {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 flex md:hidden safe-area-pb">
      {mobileNav.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href)
        const isRestock = href === '/stock'
        return (
          <Link key={href} href={href}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative transition-colors ${
              active ? 'text-green-600' : 'text-slate-400'
            }`}>
            <div className="relative">
              <Icon className="w-6 h-6" />
              {isRestock && lowStockCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {lowStockCount > 9 ? '9+' : lowStockCount}
                </span>
              )}
            </div>
            <span className={`text-xs font-medium ${active ? 'text-green-600' : 'text-slate-400'}`}>{label}</span>
            {active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-green-600 rounded-full" />}
          </Link>
        )
      })}
    </nav>
  )
}
