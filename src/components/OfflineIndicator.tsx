'use client'
import { useEffect, useState, useCallback } from 'react'
import { Wifi, WifiOff, RefreshCw, CheckCircle } from 'lucide-react'
import { fullSync, getPendingCount } from '@/lib/sync'

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [justSynced, setJustSynced] = useState(false)

  const checkPending = useCallback(async () => {
    const count = await getPendingCount()
    setPendingCount(count)
  }, [])

  const doSync = useCallback(async () => {
    if (!isOnline || syncing) return
    setSyncing(true)
    await fullSync()
    await checkPending()
    setSyncing(false)
    setJustSynced(true)
    setTimeout(() => setJustSynced(false), 3000)
  }, [isOnline, syncing, checkPending])

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = async () => {
      setIsOnline(true)
      // Auto-sync when coming back online
      await doSync()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check pending every 30 seconds
    const interval = setInterval(checkPending, 30000)
    checkPending()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [doSync, checkPending])

  // Auto-sync when online and there are pending items
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      doSync()
    }
  }, [isOnline, pendingCount, doSync])

  if (isOnline && pendingCount === 0 && !justSynced) return null

  return (
    <div className={`fixed bottom-20 md:bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-lg text-sm font-medium transition-all ${
      !isOnline
        ? 'bg-red-600 text-white'
        : justSynced
        ? 'bg-green-600 text-white'
        : 'bg-orange-500 text-white'
    }`}>
      {!isOnline ? (
        <>
          <WifiOff className="w-4 h-4" />
          <span>Offline — changes saved locally</span>
        </>
      ) : justSynced ? (
        <>
          <CheckCircle className="w-4 h-4" />
          <span>All synced!</span>
        </>
      ) : (
        <>
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Syncing…' : `${pendingCount} change${pendingCount !== 1 ? 's' : ''} pending sync`}</span>
          {!syncing && (
            <button onClick={doSync} className="ml-1 underline text-xs">Sync now</button>
          )}
        </>
      )}
    </div>
  )
}
