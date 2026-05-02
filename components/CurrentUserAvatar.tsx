'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Profile = {
  avatar: string | null
  username: string | null
  display_name: string | null
}

export default function CurrentUserAvatar() {
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('human')
        .select('avatar, username, display_name')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => { if (data) setProfile(data as Profile) })
    })
  }, [])

  const href = profile?.username ? `/${profile.username}` : '/onboarding/profile'
  const label = profile?.display_name ?? profile?.username ?? '?'

  return (
    <Link href={href} aria-label="Profile">
      <div className="relative w-8 h-8 rounded-full overflow-hidden bg-[#F7F3EE] flex items-center justify-center ring-1 ring-[#0F2240]/10">
        {profile?.avatar ? (
          <Image src={profile.avatar} alt={label} fill className="object-cover" />
        ) : (
          <span className="text-[11px] font-bold text-[#0F2240]">
            {label[0].toUpperCase()}
          </span>
        )}
      </div>
    </Link>
  )
}
