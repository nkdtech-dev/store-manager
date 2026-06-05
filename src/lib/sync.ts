import { createClient } from '@/lib/supabase/client'
import { localDb } from '@/lib/localDb'

let isSyncing = false

// Pull everything from Supabase into local DB
export async function pullFromSupabase() {
  const supabase = createClient()

  try {
    // Sync products
    const { data: products } = await supabase
      .from('products')
      .select('*, category:categories(id, name, description)')
    if (products) {
      await localDb.products.clear()
      await localDb.products.bulkPut(products.map(p => ({
        id: p.id,
        code: p.code,
        name: p.name,
        description: p.description,
        category_id: p.category_id,
        category_name: p.category?.name ?? null,
        image_url: p.image_url,
        cost_price: Number(p.cost_price),
        selling_price: Number(p.selling_price),
        stock_quantity: p.stock_quantity,
        min_stock_level: p.min_stock_level,
        unit: p.unit,
        updated_at: p.updated_at,
        synced_at: new Date().toISOString(),
      })))
    }

    // Sync categories
    const { data: categories } = await supabase.from('categories').select('*')
    if (categories) {
      await localDb.categories.clear()
      await localDb.categories.bulkPut(categories.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
      })))
    }

    // Sync profiles
    const { data: profiles } = await supabase.from('profiles').select('*')
    if (profiles) {
      await localDb.profiles.clear()
      await localDb.profiles.bulkPut(profiles.map(p => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        role: p.role,
        last_login_at: p.last_login_at,
      })))
    }

    console.log('[Sync] Pull complete')
    return true
  } catch (err) {
    console.warn('[Sync] Pull failed (offline?)', err)
    return false
  }
}

// Push pending operations to Supabase
export async function pushToSupabase(): Promise<number> {
  if (isSyncing) return 0
  isSyncing = true

  const supabase = createClient()
  const queue = await localDb.sync_queue.orderBy('created_at').toArray()

  let synced = 0

  for (const item of queue) {
    try {
      if (item.operation === 'insert') {
        const { error } = await supabase.from(item.table).insert(item.data)
        if (error) throw error
      } else if (item.operation === 'update') {
        const { id, ...rest } = item.data as Record<string, unknown>
        const { error } = await supabase.from(item.table).update(rest).eq('id', id)
        if (error) throw error
      } else if (item.operation === 'delete') {
        const { error } = await supabase.from(item.table).delete().eq('id', item.data.id)
        if (error) throw error
      }

      // Remove from queue on success
      await localDb.sync_queue.delete(item.id!)
      synced++
    } catch (err) {
      console.warn('[Sync] Failed to sync item', item, err)
      // Increment attempts
      await localDb.sync_queue.update(item.id!, { attempts: (item.attempts || 0) + 1 })
    }
  }

  if (synced > 0) {
    console.log(`[Sync] Pushed ${synced} operations to Supabase`)
    // After pushing, pull fresh data
    await pullFromSupabase()
  }

  isSyncing = false
  return synced
}

// Add an operation to the sync queue
export async function queueSync(
  operation: 'insert' | 'update' | 'delete',
  table: string,
  data: Record<string, unknown>
) {
  await localDb.sync_queue.add({
    operation,
    table,
    data,
    created_at: new Date().toISOString(),
    attempts: 0,
  })
}

// Get pending sync count
export async function getPendingCount(): Promise<number> {
  return localDb.sync_queue.count()
}

// Full sync: push first, then pull
export async function fullSync() {
  const pushed = await pushToSupabase()
  if (pushed === 0) await pullFromSupabase()
  return pushed
}
