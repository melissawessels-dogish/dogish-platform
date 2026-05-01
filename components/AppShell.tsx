import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import BottomNav from '@/components/BottomNav'

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null

  let username: string | null = null
  if (user) {
    const admin = createAdminClient()
    const { data: human } = await admin
      .from('human')
      .select('username')
      .eq('id', user.id)
      .maybeSingle()
    username = human?.username ?? null
  }

  return (
    <>
      <div className="min-h-screen pb-16">
        {children}
      </div>
      <BottomNav username={username} />
    </>
  )
}
