import { createClient } from '@/lib/supabase/client'

export type ActivityAction =
  | 'login'
  | 'sale_recorded'
  | 'product_added'
  | 'product_edited'
  | 'product_deleted'
  | 'stock_received'
  | 'expense_added'
  | 'staff_added'
  | 'staff_deleted'

export async function logActivity(action: ActivityAction, details: string) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action,
      details,
    })
  } catch {
    // Never let logging break the app
  }
}
