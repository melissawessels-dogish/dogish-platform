'use client'

import { useState, useTransition } from 'react'
import { followHuman, unfollowHuman, unfollowDog, unfollowBreed } from '@/app/actions/follow'

const btnBase = 'shrink-0 text-[12px] font-semibold px-3.5 py-1 rounded-full transition-colors disabled:opacity-50'
const btnFollowing = `${btnBase} border border-[#0F2240]/25 text-[#0F2240] hover:bg-[#F7F3EE]`
const btnFollow = `${btnBase} bg-[#0F2240] text-white hover:bg-[#0F2240]/90`

// ── Human follow/unfollow (followers page + following people section) ──────────

export function HumanFollowButton({
  targetId,
  targetUsername,
  initialFollowing,
}: {
  targetId: string
  targetUsername: string
  initialFollowing: boolean
}) {
  const [following, setFollowing] = useState(initialFollowing)
  const [pending, startTransition] = useTransition()

  const toggle = () => {
    const was = following
    setFollowing(!was)
    startTransition(async () => {
      try {
        if (was) await unfollowHuman(targetId, targetUsername)
        else await followHuman(targetId, targetUsername)
      } catch {
        setFollowing(was)
      }
    })
  }

  return (
    <button onClick={toggle} disabled={pending} className={following ? btnFollowing : btnFollow}>
      {following ? 'Following' : 'Follow'}
    </button>
  )
}

// ── Unfollow dog (following dogs section, own profile only) ───────────────────

export function UnfollowDogButton({ targetId }: { targetId: string }) {
  const [gone, setGone] = useState(false)
  const [pending, startTransition] = useTransition()

  if (gone) return null

  const handleUnfollow = () => {
    startTransition(async () => {
      try {
        await unfollowDog(targetId)
        setGone(true)
      } catch {}
    })
  }

  return (
    <button onClick={handleUnfollow} disabled={pending} className={btnFollowing}>
      Following
    </button>
  )
}

// ── Unfollow breed (following breeds section, own profile only) ───────────────

export function UnfollowBreedButton({ targetId }: { targetId: string }) {
  const [gone, setGone] = useState(false)
  const [pending, startTransition] = useTransition()

  if (gone) return null

  const handleUnfollow = () => {
    startTransition(async () => {
      try {
        await unfollowBreed(targetId)
        setGone(true)
      } catch {}
    })
  }

  return (
    <button onClick={handleUnfollow} disabled={pending} className={btnFollowing}>
      Following
    </button>
  )
}
