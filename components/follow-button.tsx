'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { followHuman, unfollowHuman, followDog, unfollowDog } from '@/app/actions/follow'

type Props = {
  targetType: 'human' | 'dog'
  targetId: string
  targetUsername?: string
  initialFollowing: boolean
  initialFollowerCount: number
  disabled?: boolean
  /** Possessive name for pack count label, e.g. "Biscuit's" or "Chris'". Defaults to "their". */
  packName?: string
}

export default function FollowButton({
  targetType,
  targetId,
  targetUsername = '',
  initialFollowing,
  initialFollowerCount,
  disabled,
  packName = 'their',
}: Props) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing)
  const [followerCount, setFollowerCount] = useState(initialFollowerCount)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (disabled) {
    return (
      <Button
        variant="ghost"
        disabled
        className="rounded-full px-6 font-medium text-[#0F2240]/40 cursor-default"
      >
        Follow
      </Button>
    )
  }

  const handleClick = () => {
    const wasFollowing = isFollowing
    setIsFollowing(!wasFollowing)
    setFollowerCount((c) => (wasFollowing ? c - 1 : c + 1))
    setError(null)

    startTransition(async () => {
      try {
        if (targetType === 'human') {
          if (wasFollowing) await unfollowHuman(targetId, targetUsername)
          else await followHuman(targetId, targetUsername)
        } else {
          if (wasFollowing) await unfollowDog(targetId)
          else await followDog(targetId)
        }
      } catch (err) {
        // Revert optimistic update
        setIsFollowing(wasFollowing)
        setFollowerCount((c) => (wasFollowing ? c + 1 : c - 1))
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        variant={isFollowing ? 'outline' : 'default'}
        className={`rounded-full px-6 font-medium transition-colors disabled:opacity-50 ${
          isFollowing
            ? 'border-[#0F2240] text-[#0F2240] hover:bg-[#F7F3EE]'
            : 'bg-[#0F2240] text-white hover:bg-[#0F2240]/90'
        }`}
      >
        {isFollowing ? 'Following' : 'Join their pack'}
      </Button>
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
