'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { markStoryViewed } from '@/app/actions/stories'

export type Story = {
  id: string
  media_url: string
  media_type: string
  caption: string | null
  author: {
    id: string
    username: string | null
    display_name: string | null
    avatar: string | null
  }
  dog: { name: string } | null
}

type Props = {
  stories: Story[]
  initialIndex?: number
  onClose: () => void
}

export default function StoryViewer({ stories, initialIndex = 0, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex)
  const [muted, setMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const markedRef = useRef(new Set<string>())

  const story = stories[index]

  const goNext = useCallback(() => {
    if (index < stories.length - 1) setIndex(index + 1)
    else onClose()
  }, [index, stories.length, onClose])

  const goPrev = useCallback(() => {
    if (index > 0) setIndex(index - 1)
  }, [index])

  // Mark viewed
  useEffect(() => {
    if (!story || markedRef.current.has(story.id)) return
    markedRef.current.add(story.id)
    markStoryViewed(story.id)
  }, [story])

  // Sync muted on video element
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted
  }, [muted])

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev, onClose])

  if (!story) return null

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const x = e.clientX
    const w = (e.currentTarget as HTMLDivElement).offsetWidth
    if (x < w / 2) goPrev()
    else goNext()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" style={{ touchAction: 'none' }}>
      <div className="relative w-full h-full max-w-sm mx-auto">

        {/* Static position indicators */}
        <div className="absolute top-3 left-3 right-3 z-10 flex gap-1">
          {stories.map((s, i) => (
            <div
              key={s.id}
              className="flex-1 h-[2px] rounded-full"
              style={{ backgroundColor: i <= index ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)' }}
            />
          ))}
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-8 right-4 z-10 text-white/80 hover:text-white"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Media */}
        <div className="absolute inset-0 cursor-pointer" onClick={handleTap}>
          {story.media_type === 'video' ? (
            <video
              key={story.id}
              ref={videoRef}
              src={story.media_url}
              className="w-full h-full object-cover"
              autoPlay
              muted={muted}
              playsInline
            />
          ) : (
            <Image
              src={story.media_url}
              alt={story.caption ?? ''}
              fill
              className="object-cover"
              priority
            />
          )}
        </div>

        {/* Bottom overlay */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-10 pt-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="relative w-8 h-8 rounded-full overflow-hidden bg-white/20 shrink-0">
              {story.author.avatar ? (
                <Image src={story.author.avatar} alt="" fill className="object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full text-white text-xs font-bold">
                  {(story.author.display_name ?? story.author.username ?? '?')[0].toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="text-white text-[13px] font-semibold leading-tight">
                {story.author.display_name ?? story.author.username}
              </p>
              {story.dog && (
                <p className="text-white/70 text-[11px]">{story.dog.name}</p>
              )}
            </div>
          </div>
          {story.caption && (
            <p className="text-white text-[13px] leading-snug">{story.caption}</p>
          )}
        </div>

        {/* Sound toggle for videos */}
        {story.media_type === 'video' && (
          <button
            onClick={(e) => { e.stopPropagation(); setMuted(!muted) }}
            className="absolute bottom-10 right-4 z-10 text-white/80 hover:text-white pointer-events-auto"
          >
            {muted ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5 6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
