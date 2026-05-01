export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { HumanFollowButton } from '@/components/follow-toggle-button'

type Follower = {
  id: string
  display_name: string | null
  username: string | null
  avatar: string | null
}

export default async function FollowersPage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: profileHuman } = await admin
    .from('human')
    .select('id, display_name')
    .eq('username', username)
    .maybeSingle()

  if (!profileHuman) notFound()

  const { data: { session } } = await supabase.auth.getSession()
  const currentUserId = session?.user?.id ?? null
  const isOwnProfile = currentUserId === profileHuman.id

  // Fetch all followers
  const { data: rows } = await admin
    .from('follow')
    .select('follower:human!follower_id(id, display_name, username, avatar)')
    .eq('target_human_id', profileHuman.id)
    .order('created_at', { ascending: false })

  const followers = (rows ?? [])
    .map((r) => r.follower as unknown as Follower | null)
    .filter((f): f is Follower => f !== null)

  // Check which followers the current user already follows
  const followingIds = new Set<string>()
  if (currentUserId && !isOwnProfile && followers.length > 0) {
    const { data: myFollows } = await admin
      .from('follow')
      .select('target_human_id')
      .eq('follower_id', currentUserId)
      .eq('target_type', 'human')
      .in('target_human_id', followers.map((f) => f.id))
    for (const row of myFollows ?? []) {
      if (row.target_human_id) followingIds.add(row.target_human_id as string)
    }
  }

  return (
    <div className="min-h-svh bg-white">
      <div className="max-w-[640px] mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#0F2240]/8 sticky top-0 bg-white z-10">
          <Link
            href={`/${username}`}
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#F7F3EE] transition-colors text-[#0F2240]/60 hover:text-[#0F2240]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-[15px] font-bold text-[#0F2240] leading-tight">Followers</h1>
            <p className="text-[12px] text-[#0F2240]/45">@{username}</p>
          </div>
        </div>

        {/* List */}
        <div className="px-4 pb-24">
          {followers.length === 0 ? (
            <p className="text-center text-[14px] text-[#0F2240]/40 py-14">No followers yet.</p>
          ) : (
            followers.map((follower) => {
              const isSelf = follower.id === currentUserId
              return (
                <div key={follower.id} className="flex items-center justify-between gap-3 py-3 border-b border-[#0F2240]/6 last:border-0">
                  <Link href={`/${follower.username}`} className="flex items-center gap-3 min-w-0">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[#EDE3D6] shrink-0">
                      {follower.avatar ? (
                        <Image src={follower.avatar} alt={follower.display_name ?? ''} fill className="object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-sm font-bold text-[#0F2240]/40">
                          {(follower.display_name ?? follower.username ?? '?')[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#0F2240] truncate">
                        {follower.display_name ?? follower.username}
                      </p>
                      {follower.username && (
                        <p className="text-[11px] text-[#0F2240]/45">@{follower.username}</p>
                      )}
                    </div>
                  </Link>

                  {!isSelf && !isOwnProfile && currentUserId && (
                    <HumanFollowButton
                      targetId={follower.id}
                      targetUsername={follower.username ?? ''}
                      initialFollowing={followingIds.has(follower.id)}
                    />
                  )}
                </div>
              )
            })
          )}
        </div>

      </div>
    </div>
  )
}
