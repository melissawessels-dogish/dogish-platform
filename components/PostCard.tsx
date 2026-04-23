'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, MessageCircle, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BookmarkButton } from '@/components/bookmark-button'
import CommentDrawer, { type DrawerCurrentUser } from '@/components/comment-drawer'

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
  currentUser?: DrawerCurrentUser | null
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

export default function PostCard({ post, isLiked: initialIsLiked, isSaved, currentUserId, currentUser = null }: Props) {
  const supabase = createClient()
  const [isLiked, setIsLiked] = useState(initialIsLiked)
  const [likeCount, setLikeCount] = useState(post.like_count ?? 0)
  const [pending, setPending] = useState(false)
  const [commentOpen, setCommentOpen] = useState(false)
  const [commentCount, setCommentCount] = useState(post.comment_count ?? 0)

  const author = post.author
  const image = post.images?.[0] ?? null
  const taggedDogs = post.post_dogs ?? []

  const handleLike = async () => {
    if (pending) return
    const wasLiked = isLiked

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
      setIsLiked(wasLiked)
      setLikeCount((c) => wasLiked ? c + 1 : c - 1)
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <article style={{ borderBottom: '1px solid #F0F0F0' }}>

        {/* Header */}
        <div className="px-3 pt-2 pb-2 flex flex-col gap-1.5">
          {/* Avatar + name row */}
          <div className="flex items-start gap-2.5">
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
            <div className="min-w-0">
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

          {/* Tagged dogs */}
          {taggedDogs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              {taggedDogs.map(({ dog }) => (
                <Link
                  key={dog.id}
                  href={author.username ? `/${author.username}/${dog.name.toLowerCase()}` : '/'}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
                >
                  <div className="relative w-8 h-8 rounded-full overflow-hidden bg-[#EDE3D6] shrink-0">
                    {dog.avatar ? (
                      <Image src={dog.avatar} alt={dog.name} fill className="object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-[10px] font-bold text-[#0F2240]/40">
                        {dog.name[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="text-[13px] font-medium text-[#0F2240]">
                    {dog.name}
                  </span>
                </Link>
              ))}
            </div>
          )}

          {/* Caption */}
          {post.body && (
            <p className="text-sm text-[#0F2240] leading-snug">{post.body}</p>
          )}
        </div>

        {/* Photo — full bleed, 4:5, object-cover */}
        {image && (
          <Link href={`/posts/${post.id}`} className="block">
            <div className="relative w-full aspect-[4/5]">
              <Image src={image} alt="" fill className="object-cover" />
            </div>
          </Link>
        )}

        {/* Action row */}
        <div className="flex items-center gap-4 px-3 pt-3 pb-3">
          <button
            type="button"
            onClick={handleLike}
            disabled={pending}
            aria-label={isLiked ? 'Unlike' : 'Like'}
            className="flex items-center gap-1.5 transition-transform active:scale-90 disabled:opacity-60"
          >
            <Heart
              className={`h-5 w-5 transition-all ${isLiked ? 'fill-[#0F2240] stroke-[#0F2240]' : 'fill-none stroke-[#0F2240]/60'}`}
              strokeWidth={1.8}
            />
            <span className={`text-sm ${isLiked ? 'text-[#0F2240]' : 'text-[#0F2240]/60'}`}>
              {likeCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setCommentOpen(true)}
            aria-label="Comments"
            className="flex items-center gap-1.5 text-[#0F2240]/60 hover:text-[#0F2240] transition-colors"
          >
            <MessageCircle className="h-5 w-5" strokeWidth={1.8} />
            <span className="text-sm">{commentCount}</span>
          </button>
          <button
            type="button"
            aria-label="Share"
            className="flex items-center text-[#0F2240]/60"
          >
            <Send className="h-5 w-5" strokeWidth={1.8} />
          </button>
          <BookmarkButton postId={post.id} initialSaved={isSaved} />
        </div>

      </article>

      <CommentDrawer
        postId={post.id}
        open={commentOpen}
        onClose={() => setCommentOpen(false)}
        commentCount={commentCount}
        onCommentCountChange={(delta) => setCommentCount((c) => c + delta)}
        currentUser={currentUser}
      />
    </>
  )
}
