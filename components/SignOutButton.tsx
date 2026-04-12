'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignOutButton() {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="text-[13px] text-[#0F2240]/50 hover:text-[#0F2240] transition-colors"
    >
      Sign out
    </button>
  )
}
