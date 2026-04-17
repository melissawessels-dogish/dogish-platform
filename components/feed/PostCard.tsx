'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, MessageCircle, MapPin } from 'lucide-react'
import { toggleLike } from '@/app/actions/likes'

export type PostCardProps = {
  id: string
  author: { username: string; display_name: string | null; avatar: string | null }
  post_type: string
  body: string | null
  images: string[] | null
  place_name: string | null
  like_count: number
  comment_count: number
  created_at: string
  dogs: { id: string; name: string; avatar: string | null }[]
  isLiked: boolean
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  return `${weeks}w ago`
}

function AuthorAvatar({ author }: { author: PostCardProps['author'] }) {
  const initials = (author.display_name ?? author.username ?? '?')[0].toUpperCase()
  return (
    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[#EDE3D6] shrink-0">
      {author.avatar ? (
        <Image src={author.avatar} alt={author.display_name ?? author.username} fill className="object-cover" />
      ) : (
        <div className="flex items-center justify-center h-full text-sm font-bold text-[#0F2240]/40">
          {initials}
        </div>
      )}
    </div>
  )
}

function DogAvatar({ dog }: { dog: PostCardProps['dogs'][number] }) {
  return (
    <div className="relative w-6 h-6 rounded-full overflow-hidden bg-[#EDE3D6] shrink-0">
      {dog.avatar ? (
        <Image src={dog.avatar} alt={dog.name} fill className="object-cover" />
      ) : (
        <div className="flex items-center justify-center h-full text-[9px] font-bold text-[#0F2240]/40">
          {dog.name[0].toUpperCase()}
        </div>
      )}
    </div>
  )
}

function ImageGrid({ images }: { images: string[] }) {
  const shown = images.slice(0, 4)

  if (shown.length === 1) {
    return (
      <div className="relative w-full aspect-[4/5] rounded-lg overflow-hidden">
        <Image src={shown[0]} alt="" fill className="object-cover" />
      </div>
    )
  }

  if (shown.length === 2) {
    return (
      <div className="flex gap-1">
        {shown.map((src, i) => (
          <div key={i} className="relative flex-1 aspect-video rounded-lg overflow-hidden">
            <Image src={src} alt="" fill className="object-cover" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-1">
      {shown.map((src, i) => (
        <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
          <Image src={src} alt="" fill className="object-cover" />
        </div>
      ))}
    </div>
  )
}

export default function PostCard(props: PostCardProps) {
  const { id, author, post_type, body, images, place_name, like_count, comment_count, created_at, dogs, isLiked } = props
  const hasImages = images && images.length > 0
  const isPhoto = post_type === 'photo'

  const [liked, setLiked] = useState(isLiked)
  const [count, setCount] = useState(like_count)
  const [pending, setPending] = useState(false)

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (pending) return
    const wasLiked = liked
    setLiked(!wasLiked)
    setCount((c) => wasLiked ? c - 1 : c + 1)
    setPending(true)
    try {
      await toggleLike(id, wasLiked)
    } catch {
      setLiked(wasLiked)
      setCount((c) => wasLiked ? c + 1 : c - 1)
    } finally {
      setPending(false)
    }
  }

  return (
    <article className="relative bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 mb-3">
      {/* Invisible full-card link overlay */}
      <Link href={`/posts/${id}`} className="absolute inset-0 rounded-2xl z-0" aria-label="View post" />

      {/* Post type badge */}
      {!isPhoto && (
        <span className="absolute top-4 right-4 z-10 text-[11px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500">
          {post_type.charAt(0).toUpperCase() + post_type.slice(1)}
        </span>
      )}

      {/* Author row */}
      <div className="relative z-10 flex items-center gap-2.5 mb-2">
        <Link
          href={`/${author.username}`}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0"
        >
          <AuthorAvatar author={author} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={`/${author.username}`}
            onClick={(e) => e.stopPropagation()}
            className="hover:underline underline-offset-2"
          >
            <p className="text-[13px] font-bold text-[#0F2240] leading-tight truncate">
              {author.display_name ?? author.username}
            </p>
          </Link>
          <p className="text-[11px] text-zinc-500 leading-tight">
            @{author.username} · {timeAgo(created_at)}
          </p>
        </div>
      </div>

      {/* Place name */}
      {place_name && (
        <div className="relative z-10 flex items-center gap-1 mb-2">
          <MapPin size={12} className="text-zinc-400 shrink-0" />
          <span className="text-[11px] text-zinc-500 truncate">{place_name}</span>
        </div>
      )}

      {/* Tagged dogs */}
      {dogs.length > 0 && (
        <div className="relative z-10 flex items-center gap-2 flex-wrap mb-2">
          {dogs.map((dog) => (
            <Link
              key={dog.id}
              href={`/${author.username}/${dog.name.toLowerCase()}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 group"
            >
              <DogAvatar dog={dog} />
              <span className="text-[11px] font-medium text-[#0F2240] underline underline-offset-2 group-hover:text-[#0F2240]/70 transition-colors">
                {dog.name}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Body */}
      {body && (
        <p className="relative z-10 text-sm text-[#0F2240] leading-snug mb-2">{body}</p>
      )}

      {/* Images */}
      {hasImages && (
        <div className="relative z-10 mb-3">
          <ImageGrid images={images} />
        </div>
      )}

      {/* Footer */}
      <div className="relative z-10 flex items-center gap-4 pt-1">
        <button
          type="button"
          onClick={handleLike}
          disabled={pending}
          aria-label={liked ? 'Unlike' : 'Like'}
          className="flex items-center gap-1 text-sm transition-transform active:scale-90 disabled:opacity-60"
        >
          <Heart
            size={15}
            strokeWidth={1.8}
            style={{
              fill: liked ? '#e11d48' : 'none',
              stroke: liked ? '#e11d48' : '#a1a1aa',
            }}
          />
          <span className={liked ? 'text-[#e11d48]' : 'text-zinc-400'}>{count}</span>
        </button>
        <span className="flex items-center gap-1 text-sm text-zinc-400">
          <MessageCircle size={15} strokeWidth={1.8} />
          {comment_count}
        </span>
      </div>
    </article>
  )
}
