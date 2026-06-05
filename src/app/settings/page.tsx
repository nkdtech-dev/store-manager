'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { Settings, Receipt, Bell, Store, Save } from 'lucide-react'

interface StoreSettings {
  storeName: string
  receiptEnabled: boolean
  lowStockAlerts: boolean
  currency: string
}

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'NDA Store',
  receiptEnabled: true,
  lowStockAlerts: true,
  currency: 'FCFA',
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('store_settings')
    if (stored) setSettings(JSON.parse(stored))
  }, [])

  function save() {
    localStorage.setItem('store_settings', JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <AppShell>
      <div className="p-6 max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
          <p className="text-slate-500 text-sm">Admin configuration for the store</p>
        </div>

        {/* Store Info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Store className="w-5 h-5 text-green-600" />
            <h2 className="font-semibold text-slate-700">Store Info</h2>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Store Name</label>
            <input
              value={settings.storeName}
              onChange={e => setSettings(s => ({ ...s, storeName: e.target.value }))}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
            <select
              value={settings.currency}
              onChange={e => setSettings(s => ({ ...s, currency: e.target.value }))}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="FCFA">FCFA (CFA Franc)</option>
              <option value="USD">USD (US Dollar)</option>
              <option value="EUR">EUR (Euro)</option>
              <option value="GBP">GBP (British Pound)</option>
              <option value="NGN">NGN (Nigerian Naira)</option>
              <option value="GHS">GHS (Ghana Cedi)</option>
            </select>
          </div>
        </div>

        {/* Sales Settings */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="w-5 h-5 text-green-600" />
            <h2 className="font-semibold text-slate-700">Sales Settings</h2>
          </div>

          <Toggle
            label="Show Receipt After Sale"
            description="Automatically show printable receipt popup after every confirmed sale"
            enabled={settings.receiptEnabled}
            onChange={v => setSettings(s => ({ ...s, receiptEnabled: v }))}
          />
        </div>

        {/* Alert Settings */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-5 h-5 text-green-600" />
            <h2 className="font-semibold text-slate-700">Alerts</h2>
          </div>

          <Toggle
            label="Low Stock Alerts"
            description="Show warning badge on Stock page when items are running low"
            enabled={settings.lowStockAlerts}
            onChange={v => setSettings(s => ({ ...s, lowStockAlerts: v }))}
          />
        </div>

        <button
          onClick={save}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-colors ${
            saved ? 'bg-green-100 text-green-700' : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          <Save className="w-4 h-4" />
          {saved ? 'Settings Saved!' : 'Save Settings'}
        </button>
      </div>
    </AppShell>
  )
}

function Toggle({ label, description, enabled, onChange }: {
  label: string
  description: string
  enabled: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
          enabled ? 'bg-green-500' : 'bg-slate-300'
        }`}
      >
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
          enabled ? 'translate-x-7' : 'translate-x-1'
        }`} />
      </button>
    </div>
  )
}
