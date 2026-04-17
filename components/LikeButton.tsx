'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { toggleLike } from '@/app/actions/likes'

type Props = {
  postId: string
  initialLikeCount: number
  initialIsLiked: boolean
}

export default function LikeButton({ postId, initialLikeCount, initialIsLiked }: Props) {
  const [liked, setLiked] = useState(initialIsLiked)
  const [count, setCount] = useState(initialLikeCount)
  const [pending, setPending] = useState(false)

  const handleLike = async () => {
    if (pending) return
    const wasLiked = liked
    setLiked(!wasLiked)
    setCount((c) => wasLiked ? c - 1 : c + 1)
    setPending(true)
    try {
      await toggleLike(postId, wasLiked)
    } catch {
      setLiked(wasLiked)
      setCount((c) => wasLiked ? c + 1 : c - 1)
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleLike}
        disabled={pending}
        aria-label={liked ? 'Unlike' : 'Like'}
        className="flex items-center gap-1.5 transition-transform active:scale-90 disabled:opacity-60"
        style={{ color: liked ? '#e11d48' : 'rgba(15,34,64,0.6)' }}
      >
        <Heart
          size={22}
          strokeWidth={1.8}
          style={{
            fill: liked ? '#e11d48' : 'none',
            stroke: liked ? '#e11d48' : 'currentColor',
          }}
        />
      </button>
      <p className="text-[12px] font-semibold text-[#0F2240] mt-2">
        {count} {count === 1 ? 'like' : 'likes'}
      </p>
    </>
  )
}
