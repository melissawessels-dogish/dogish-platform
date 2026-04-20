'use client'

import { useState, useTransition } from 'react'
import { Bookmark } from 'lucide-react'
import { savePost, unsavePost } from '@/app/actions/saved-posts'
import { cn } from '@/lib/utils'

interface BookmarkButtonProps {
  postId: string
  initialSaved: boolean
  className?: string
}

export function BookmarkButton({ postId, initialSaved, className }: BookmarkButtonProps) {
  const [saved, setSaved] = useState(initialSaved)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    const next = !saved
    setSaved(next)
    startTransition(async () => {
      const result = next ? await savePost(postId) : await unsavePost(postId)
      if (result.error) setSaved(!next)
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      aria-label={saved ? 'Remove bookmark' : 'Save post'}
      className={cn(
        'flex items-center justify-center transition-colors',
        className
      )}
    >
      <Bookmark
        size={24}
        strokeWidth={1.8}
        className={cn(
          'transition-all',
          saved ? 'fill-[#0F2240] stroke-[#0F2240]' : 'fill-none stroke-[#0F2240]'
        )}
      />
    </button>
  )
}
