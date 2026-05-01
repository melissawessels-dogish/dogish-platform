import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function SavedPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: human } = await admin
    .from('human')
    .select('username')
    .eq('id', user.id)
    .maybeSingle()

  redirect(`/${human?.username ?? user.id}?tab=kits`)
}
