'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BookmarkButton } from '@/components/bookmark-button'

type Dog = {
  id: string
  name: string
  avatar: string | null
}

type Author = {
  id: string
  display_name: string | null
  username: string | null
  avatar: string | null
}

export type PostCardPost = {
  id: string
  body: string | null
  images: string[] | null
  created_at: string
  author: Author
  post_dogs: { dog: Dog }[]
  like_count: number | null
  comment_count: number | null
}

type Props = {
  post: PostCardPost
  isLiked: boolean
  isSaved: boolean
  currentUserId: string
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

export default function PostCard({ post, isLiked: initialIsLiked, isSaved, currentUserId }: Props) {
  const supabase = createClient()
  const [isLiked, setIsLiked] = useState(initialIsLiked)
  const [likeCount, setLikeCount] = useState(post.like_count ?? 0)
  const [pending, setPending] = useState(false)

  const author = post.author
  const image = post.images?.[0] ?? null
  const taggedDogs = post.post_dogs ?? []

  const handleLike = async () => {
    if (pending) return
    const wasLiked = isLiked

    // Optimistic update
    setIsLiked(!wasLiked)
    setLikeCount((c) => wasLiked ? c - 1 : c + 1)
    setPending(true)

    try {
      if (wasLiked) {
        const { error } = await supabase
          .from('like_')
          .delete()
          .eq('human_id', currentUserId)
          .eq('post_id', post.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('like_')
          .insert({ human_id: currentUserId, post_id: post.id })
        if (error) throw error
      }
    } catch {
      // Revert on error
      setIsLiked(wasLiked)
      setLikeCount((c) => wasLiked ? c + 1 : c - 1)
    } finally {
      setPending(false)
    }
  }

  return (
    <article style={{ borderBottom: '1px solid #F0F0F0' }}>

      {/* Author row */}
      <div className="flex items-center gap-2.5 px-3 py-2">
        <Link href={author.username ? `/${author.username}` : '/'} className="shrink-0">
          <div className="relative w-8 h-8 rounded-full overflow-hidden bg-[#EDE3D6]">
            {author.avatar ? (
              <Image src={author.avatar} alt={author.display_name ?? ''} fill className="object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full text-sm font-bold text-[#0F2240]/40">
                {(author.display_name ?? author.username ?? '?')[0].toUpperCase()}
              </div>
            )}
          </div>
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={author.username ? `/${author.username}` : '/'} className="hover:underline underline-offset-2">
            <p className="text-[13px] font-semibold text-[#0F2240] leading-tight truncate">
              {author.display_name ?? author.username}
            </p>
          </Link>
          {author.username && (
            <p className="text-[11px] text-[#0F2240]/45 leading-tight">
              @{author.username} · {timeAgo(post.created_at)}
            </p>
          )}
        </div>
      </div>

      {/* Photo — full bleed, 4:5, object-cover */}
      {image && (
        <Link href={`/posts/${post.id}`} className="block">
          <div className="relative w-full aspect-[4/5]">
            <Image src={image} alt="" fill className="object-cover" />
          </div>
        </Link>
      )}

      {/* Action row: like + comment + bookmark */}
      <div className="flex items-center gap-3 px-3 pt-2">
        <button
          type="button"
          onClick={handleLike}
          disabled={pending}
          aria-label={isLiked ? 'Unlike' : 'Like'}
          className="transition-transform active:scale-90 disabled:opacity-60"
        >
          <Heart
            size={24}
            strokeWidth={1.8}
            fill={isLiked ? '#e11d48' : 'none'}
            stroke={isLiked ? '#e11d48' : '#0F2240'}
          />
        </button>
        <Link
          href={`/posts/${post.id}#comments`}
          aria-label="Comments"
          className="flex items-center justify-center p-1 -m-1 text-[#0F2240]/60 hover:text-[#0F2240] transition-colors"
        >
          <MessageCircle size={24} strokeWidth={1.8} />
        </Link>
        <div className="ml-auto">
          <BookmarkButton postId={post.id} initialSaved={isSaved} />
        </div>
      </div>

      {/* Below image */}
      <div className="px-3 pt-1.5 pb-3 flex flex-col gap-1">

        {/* Like + comment counts */}
        <p className="text-[12px] font-semibold text-[#0F2240]">
          {likeCount} {likeCount === 1 ? 'like' : 'likes'}
          <span className="font-normal text-[#0F2240]/45 ml-2">
            {post.comment_count ?? 0} {(post.comment_count ?? 0) === 1 ? 'comment' : 'comments'}
          </span>
        </p>

        {/* Caption */}
        {post.body && (
          <p className="text-[13px] text-[#0F2240] leading-snug">
            <span className="font-semibold mr-1">{author.username}</span>
            {post.body}
          </p>
        )}

        {/* Tagged dogs */}
        {taggedDogs.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            {taggedDogs.map(({ dog }) => (
              <Link
                key={dog.id}
                href={author.username ? `/${author.username}/${dog.name.toLowerCase()}` : '/'}
                className="flex items-center gap-1 group"
              >
                <div className="relative w-4 h-4 rounded-full overflow-hidden bg-[#EDE3D6] shrink-0">
                  {dog.avatar ? (
                    <Image src={dog.avatar} alt={dog.name} fill className="object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-[8px] font-bold text-[#0F2240]/40">
                      {dog.name[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-[11px] font-medium text-[#0F2240] underline underline-offset-2 group-hover:text-[#0F2240]/70 transition-colors">
                  {dog.name}
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* Comment count */}
        <Link
          href={`/posts/${post.id}#comments`}
          className="text-[12px] text-[#0F2240]/45 hover:text-[#0F2240]/70 underline underline-offset-2 transition-colors"
        >
          View all {post.comment_count ?? 0} comments
        </Link>
      </div>
    </article>
  )
}
