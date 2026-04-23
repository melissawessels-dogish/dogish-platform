'use client'

import { useState, useEffect, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { followHuman, unfollowHuman } from '@/app/actions/follow'

type HumanRow = {
  id: string
  display_name: string | null
  username: string | null
  avatar: string | null
}

type Props = {
  profileUserId: string
  currentUserId: string | null
  type: 'followers' | 'following'
  open: boolean
  onClose: () => void
}

export default function FollowListDrawer({ profileUserId, currentUserId, type, open, onClose }: Props) {
  const supabase = createClient()
  const [users, setUsers] = useState<HumanRow[]>([])
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (!open || loaded) return

    async function load() {
      let rows: HumanRow[] = []

      if (type === 'followers') {
        const { data } = await supabase
          .from('follow')
          .select('follower:human!follower_id(id, display_name, username, avatar)')
          .eq('target_human_id', profileUserId)
        rows = (data ?? []).map((r) => r.follower as unknown as HumanRow | null).filter((r): r is HumanRow => r !== null)
      } else {
        const { data } = await supabase
          .from('follow')
          .select('followed:human!target_human_id(id, display_name, username, avatar)')
          .eq('follower_id', profileUserId)
          .eq('target_type', 'human')
        rows = (data ?? []).map((r) => r.followed as unknown as HumanRow | null).filter((r): r is HumanRow => r !== null)
      }

      setUsers(rows)

      if (currentUserId && rows.length > 0) {
        const { data: myFollows } = await supabase
          .from('follow')
          .select('target_human_id')
          .eq('follower_id', currentUserId)
          .eq('target_type', 'human')
          .in('target_human_id', rows.map((r) => r.id))
        setFollowingIds(new Set((myFollows ?? []).map((r) => r.target_human_id as string)))
      }

      setLoaded(true)
    }

    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loaded, profileUserId, type, currentUserId])

  const handleToggle = (user: HumanRow) => {
    if (!currentUserId || pendingIds.has(user.id)) return
    const wasFollowing = followingIds.has(user.id)

    setPendingIds((s) => new Set(s).add(user.id))
    setFollowingIds((prev) => {
      const next = new Set(prev)
      wasFollowing ? next.delete(user.id) : next.add(user.id)
      return next
    })

    startTransition(async () => {
      try {
        if (wasFollowing) await unfollowHuman(user.id, user.username ?? '')
        else await followHuman(user.id, user.username ?? '')
      } catch {
        setFollowingIds((prev) => {
          const next = new Set(prev)
          wasFollowing ? next.add(user.id) : next.delete(user.id)
          return next
        })
      } finally {
        setPendingIds((s) => {
          const next = new Set(s)
          next.delete(user.id)
          return next
        })
      }
    })
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/40" style={{ zIndex: 9998 }} onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[75vh] flex flex-col" style={{ zIndex: 9999 }}>
        <div className="flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-[#0F2240]/15" />
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#0F2240]/8 shrink-0">
          <span className="text-[14px] font-semibold text-[#0F2240] capitalize">{type}</span>
          <button onClick={onClose} className="text-[#0F2240]/40 hover:text-[#0F2240] transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pt-2" style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' }}>
          {!loaded && (
            <p className="text-sm text-[#0F2240]/40 text-center py-8">Loading…</p>
          )}
          {loaded && users.length === 0 && (
            <p className="text-sm text-[#0F2240]/40 text-center py-8">Nobody here yet.</p>
          )}
          {users.map((user) => {
            const isSelf = user.id === currentUserId
            const isFollowing = followingIds.has(user.id)
            const isPending = pendingIds.has(user.id)
            return (
              <div key={user.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-[#0F2240]/6 last:border-0">
                {/* Left: avatar + name */}
                <div className="flex items-center gap-3 min-w-0">
                  <Link href={user.username ? `/${user.username}` : '/'} onClick={onClose} className="shrink-0">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[#EDE3D6]">
                      {user.avatar ? (
                        <Image src={user.avatar} alt={user.display_name ?? ''} fill className="object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-sm font-bold text-[#0F2240]/40">
                          {(user.display_name ?? user.username ?? '?')[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                  </Link>
                  <Link href={user.username ? `/${user.username}` : '/'} onClick={onClose} className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#0F2240] truncate">{user.display_name ?? user.username}</p>
                    {user.username && <p className="text-[11px] text-[#0F2240]/45">@{user.username}</p>}
                  </Link>
                </div>
                {/* Right: follow button (hidden for logged-in user's own row) */}
                {!isSelf && (
                  <button
                    onClick={() => handleToggle(user)}
                    disabled={isPending}
                    className={`shrink-0 text-[12px] font-semibold px-3.5 py-1 rounded-full transition-colors disabled:opacity-50 ${
                      isFollowing
                        ? 'border border-[#0F2240]/25 text-[#0F2240] hover:bg-[#F7F3EE]'
                        : 'bg-[#0F2240] text-white hover:bg-[#0F2240]/90'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Join their pack'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
