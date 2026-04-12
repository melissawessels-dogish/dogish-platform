'use client'

import { useState, useTransition } from 'react'
import { followHuman, unfollowHuman, followDog, unfollowDog } from '@/app/actions/follow'

type Props = {
  targetType: 'human' | 'dog'
  targetId: string
  targetUsername?: string | null
  isFollowing: boolean
  followerCount: number
}

export default function FollowButton({
  targetType,
  targetId,
  targetUsername,
  isFollowing: initialIsFollowing,
}: Props) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [hovered, setHovered] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    console.log('follow clicked', { targetType, targetId, isFollowing })
    const prev = isFollowing
    setIsFollowing(!prev)

    startTransition(async () => {
      let result: { error: string } | undefined

      if (targetType === 'human') {
        if (prev) {
          result = (await unfollowHuman(targetId, targetUsername ?? '')) as typeof result
        } else {
          result = (await followHuman(targetId, targetUsername ?? '')) as typeof result
        }
      } else {
        const revalidateUrl = targetUsername ? `/${targetUsername}` : '/'
        if (prev) {
          result = (await unfollowDog(targetId, revalidateUrl)) as typeof result
        } else {
          result = (await followDog(targetId, revalidateUrl)) as typeof result
        }
      }

      if (result?.error) {
        setIsFollowing(prev)
      }
    })
  }

  if (isFollowing) {
    return (
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        disabled={isPending}
        className="text-[13px] font-semibold px-5 py-1.5 rounded-full border transition-colors whitespace-nowrap disabled:opacity-50"
        style={{
          backgroundColor: 'white',
          borderColor: hovered ? '#dc2626' : '#0F2240',
          color: hovered ? '#dc2626' : '#0F2240',
        }}
      >
        {hovered ? 'Unfollow' : 'Following'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="text-[13px] font-semibold px-5 py-1.5 rounded-full text-white transition-colors whitespace-nowrap disabled:opacity-50"
      style={{ backgroundColor: '#0F2240' }}
    >
      Follow
    </button>
  )
}
