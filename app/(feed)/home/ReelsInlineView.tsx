'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toggleLike } from '@/app/actions/likes'

type Reel = {
  id: string
  video_url: string
  images: string[] | null
  body: string | null
  like_count: number | null
  comment_count: number | null
  author: {
    id: string
    username: string | null
    display_name: string | null
    avatar: string | null
  } | null
  post_dogs: { dog: { id: string; name: string } | null }[]
}

function ReelItem({
  reel,
  muted,
  onToggleMute,
  currentUserId,
  initialLiked,
  isActive,
}: {
  reel: Reel
  muted: boolean
  onToggleMute: () => void
  currentUserId: string | null
  initialLiked: boolean
  isActive: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [liked, setLiked] = useState(initialLiked)
  const [likeCount, setLikeCount] = useState(reel.like_count ?? 0)
  const [liking, setLiking] = useState(false)

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted
  }, [muted])

  // Pause all videos when the Reels tab becomes inactive
  useEffect(() => {
    if (!isActive) videoRef.current?.pause()
  }, [isActive])

  // Autoplay when in view — only when the Reels tab is active
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && isActive) {
          videoRef.current?.play().catch(() => {})
        } else {
          videoRef.current?.pause()
        }
      },
      { threshold: 0.6 }
    )
    observer.observe(container)
    return () => observer.disconnect()
  }, [isActive])

  const handleLike = async () => {
    if (!currentUserId || liking) return
    const wasLiked = liked
    setLiking(true)
    setLiked(!wasLiked)
    setLikeCount((c) => c + (wasLiked ? -1 : 1))
    try {
      await toggleLike(reel.id, wasLiked)
    } catch {
      setLiked(wasLiked)
      setLikeCount((c) => c + (wasLiked ? 1 : -1))
    } finally {
      setLiking(false)
    }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/posts/${reel.id}`
    if (navigator.share) {
      try { await navigator.share({ url }) } catch {}
    } else {
      try { await navigator.clipboard.writeText(url) } catch {}
    }
  }

  const dogs = reel.post_dogs
    .map((pd) => pd.dog)
    .filter((d): d is { id: string; name: string } => d !== null)

  return (
    <div
      ref={containerRef}
      style={{
        height: 'calc(100dvh - 97px)',
        scrollSnapAlign: 'start',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#0F2240',
        flexShrink: 0,
      }}
    >
      <video
        ref={videoRef}
        src={reel.video_url}
        loop
        muted
        playsInline
        preload="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 40%, transparent 65%)', pointerEvents: 'none', zIndex: 1 }} />
      <button onClick={onToggleMute} aria-label={muted ? 'Unmute' : 'Mute'} style={{ position: 'absolute', inset: 0, background: 'none', border: 'none', cursor: 'pointer', zIndex: 2 }} />

      {/* Mute indicator */}
      <div style={{ position: 'absolute', top: 52, right: 14, zIndex: 5 }}>
        <div style={{ background: 'rgba(0,0,0,0.45)', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {muted ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )}
        </div>
      </div>

      {/* Right action column */}
      <div style={{ position: 'absolute', right: 12, bottom: 90, zIndex: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
        <button onClick={handleLike} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: currentUserId ? 'pointer' : 'default' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill={liked ? '#FF4D4D' : 'none'} stroke={liked ? '#FF4D4D' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span style={{ color: 'white', fontSize: 12, fontWeight: 600, lineHeight: 1 }}>{likeCount}</span>
        </button>
        <Link href={`/posts/${reel.id}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, zIndex: 4 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span style={{ color: 'white', fontSize: 12, fontWeight: 600, lineHeight: 1 }}>{reel.comment_count ?? 0}</span>
        </Link>
        <button onClick={handleShare} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span style={{ color: 'white', fontSize: 12, fontWeight: 600, lineHeight: 1 }}>Share</span>
        </button>
      </div>

      {/* Bottom info */}
      <div style={{ position: 'absolute', bottom: 74, left: 14, right: 72, zIndex: 4 }}>
        {reel.author && (
          <Link href={`/${reel.author.username}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 8, position: 'relative' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: '#EDE3D6', flexShrink: 0, position: 'relative', border: '2px solid rgba(255,255,255,0.6)' }}>
              {reel.author.avatar ? (
                <Image src={reel.author.avatar} alt={reel.author.display_name ?? ''} fill style={{ objectFit: 'cover' }} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 14, fontWeight: 700, color: 'rgba(15,34,64,0.5)' }}>
                  {(reel.author.display_name ?? reel.author.username ?? '?')[0].toUpperCase()}
                </div>
              )}
            </div>
            <span style={{ color: 'white', fontSize: 14, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>@{reel.author.username}</span>
          </Link>
        )}
        {dogs.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 7 }}>
            {dogs.map((dog) => (
              <span key={dog.id} style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(4px)', borderRadius: 100, padding: '3px 10px', fontSize: 12, fontWeight: 500, color: 'white' }}>
                {dog.name}
              </span>
            ))}
          </div>
        )}
        {reel.body && (
          <p style={{ color: 'white', fontSize: 14, lineHeight: 1.45, margin: 0, textShadow: '0 1px 3px rgba(0,0,0,0.35)' }}>{reel.body}</p>
        )}
      </div>
    </div>
  )
}

export default function ReelsInlineView({ isActive }: { isActive: boolean }) {
  const [reels, setReels] = useState<Reel[]>([])
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [muted, setMuted] = useState(true)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id ?? null
      setCurrentUserId(userId)
      const { data } = await supabase
        .from('post')
        .select('id, video_url, images, body, like_count, comment_count, author:human!author_id(id, username, display_name, avatar), post_dogs(dog:dog_id(id, name))')
        .eq('post_type', 'reel')
        .not('video_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20)
      const reelList = (data ?? []) as unknown as Reel[]
      setReels(reelList)
      if (userId && reelList.length > 0) {
        const ids = reelList.map((r) => r.id)
        const { data: likes } = await supabase.from('like_').select('post_id').in('post_id', ids).eq('human_id', userId)
        setLikedIds(new Set((likes ?? []).map((l: { post_id: string }) => l.post_id)))
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div style={{ height: 'calc(100dvh - 97px)', background: '#0F2240', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes reel-spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'white', animation: 'reel-spin 0.8s linear infinite' }} />
      </div>
    )
  }

  if (reels.length === 0) {
    return (
      <div style={{ height: 'calc(100dvh - 97px)', background: '#0F2240', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'white', fontSize: 16, fontWeight: 600, margin: 0 }}>No reels yet</p>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 6 }}>Check back soon.</p>
      </div>
    )
  }

  return (
    <>
      <style>{`.reels-inline-scroll { scrollbar-width: none; } .reels-inline-scroll::-webkit-scrollbar { display: none; }`}</style>
      <div
        className="reels-inline-scroll"
        style={{
          height: 'calc(100dvh - 97px)',
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          backgroundColor: '#0F2240',
        }}
      >
        {reels.map((reel) => (
          <ReelItem
            key={reel.id}
            reel={reel}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
            currentUserId={currentUserId}
            initialLiked={likedIds.has(reel.id)}
            isActive={isActive}
          />
        ))}
      </div>
    </>
  )
}
