import { createClient } from '@/lib/supabase/client'
import { localDb } from '@/lib/localDb'

let isSyncing = false

export async function pullFromSupabase(): Promise<boolean> {
  const supabase = createClient()
  try {
    // Products
    const { data: products } = await supabase
      .from('products')
      .select('*, category:categories(id,name,description)')
    if (products) {
      await localDb.products.clear()
      await localDb.products.bulkPut(products.map(p => ({
        id: p.id, code: p.code, name: p.name,
        description: p.description, category_id: p.category_id,
        category_name: p.category?.name ?? null,
        image_url: p.image_url,
        cost_price: Number(p.cost_price),
        selling_price: Number(p.selling_price),
        stock_quantity: p.stock_quantity,
        min_stock_level: p.min_stock_level,
        unit: p.unit, updated_at: p.updated_at,
        synced_at: new Date().toISOString(),
      })))
    }

    // Categories
    const { data: categories } = await supabase.from('categories').select('*')
    if (categories) {
      await localDb.categories.clear()
      await localDb.categories.bulkPut(categories.map(c => ({
        id: c.id, name: c.name, description: c.description,
      })))
    }

    // Profiles
    const { data: profiles } = await supabase.from('profiles').select('*')
    if (profiles) {
      await localDb.profiles.clear()
      await localDb.profiles.bulkPut(profiles.map(p => ({
        id: p.id, email: p.email, full_name: p.full_name,
        role: p.role, last_login_at: p.last_login_at,
      })))
    }

    // Sales (last 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const { data: sales } = await supabase
      .from('sales')
      .select('*, cashier:profiles(full_name)')
      .gte('created_at', ninetyDaysAgo)
      .order('created_at', { ascending: false })
    if (sales) {
      await localDb.sales.clear()
      await localDb.sales.bulkPut(sales.map((s: any) => ({
        id: s.id,
        receipt_number: s.receipt_number,
        cashier_id: s.cashier_id,
        cashier_name: s.cashier?.full_name ?? null,
        total_amount: Number(s.total_amount),
        discount: Number(s.discount ?? 0),
        payment_method: s.payment_method,
        notes: s.notes,
        created_at: s.created_at,
      })))
    }

    // Sale items
    const { data: saleItems } = await supabase
      .from('sale_items')
      .select('*, product:products(name,code)')
      .gte('created_at', ninetyDaysAgo)
    if (saleItems) {
      await localDb.sale_items.clear()
      await localDb.sale_items.bulkPut(saleItems.map((i: any) => ({
        id: i.id, sale_id: i.sale_id, product_id: i.product_id,
        product_name: i.product?.name ?? null,
        product_code: i.product?.code ?? null,
        quantity: i.quantity,
        unit_price: Number(i.unit_price),
        discount: Number(i.discount ?? 0),
        subtotal: Number(i.subtotal),
        created_at: i.created_at,
      })))
    }

    // Stock movements (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: movements } = await supabase
      .from('stock_movements')
      .select('*, product:products(name,code), created_by_profile:profiles(full_name)')
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
    if (movements) {
      await localDb.stock_movements.clear()
      await localDb.stock_movements.bulkPut(movements.map((m: any) => ({
        id: m.id, product_id: m.product_id,
        product_name: m.product?.name ?? null,
        product_code: m.product?.code ?? null,
        type: m.type, quantity: m.quantity,
        note: m.note, created_by: m.created_by,
        created_by_name: m.created_by_profile?.full_name ?? null,
        created_at: m.created_at,
      })))
    }

    // Expenses (last 90 days)
    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .gte('created_at', ninetyDaysAgo)
      .order('created_at', { ascending: false })
    if (expenses) {
      await localDb.expenses.clear()
      await localDb.expenses.bulkPut(expenses.map((e: any) => ({
        id: e.id, description: e.description,
        amount: Number(e.amount), category: e.category,
        recorded_by: e.recorded_by, created_at: e.created_at,
      })))
    }

    console.log('[Sync] Pull complete — all tables synced')
    return true
  } catch (err) {
    console.warn('[Sync] Pull failed (offline?)', err)
    return false
  }
}

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
      await localDb.sync_queue.delete(item.id!)
      synced++
    } catch (err) {
      console.warn('[Sync] Failed to sync item', item, err)
      await localDb.sync_queue.update(item.id!, { attempts: (item.attempts || 0) + 1 })
    }
  }

  if (synced > 0) {
    console.log(`[Sync] Pushed ${synced} operations`)
    await pullFromSupabase()
  }

  isSyncing = false
  return synced
}

export async function queueSync(
  operation: 'insert' | 'update' | 'delete',
  table: string,
  data: Record<string, unknown>
) {
  await localDb.sync_queue.add({
    operation, table, data,
    created_at: new Date().toISOString(),
    attempts: 0,
  })
}

export async function getPendingCount(): Promise<number> {
  return localDb.sync_queue.count()
}

export async function fullSync() {
  const pushed = await pushToSupabase()
  if (pushed === 0) await pullFromSupabase()
  return pushed
}
