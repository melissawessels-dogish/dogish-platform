import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null

  if (!user) {
    redirect('/login')
  }

  const { data: human } = await supabase
    .from('human')
    .select('username')
    .eq('id', user.id)
    .maybeSingle()

  if (human?.username) {
    redirect('/home')
  }

  redirect('/onboarding/profile')
}
