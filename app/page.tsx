import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: human } = await supabase
    .from('human')
    .select('username')
    .eq('id', user.id)
    .maybeSingle()

  if (human?.username) {
    redirect(`/${human.username}`)
  }

  redirect('/onboarding/profile')
}
