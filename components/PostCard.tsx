'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, MessageCircle, Repeat2, Bookmark } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BookmarkButton } from '@/components/bookmark-button'
import CommentDrawer, { type DrawerCurrentUser } from '@/components/comment-drawer'
import RepostDrawer from '@/components/RepostDrawer'
import { slugify } from '@/lib/slugify'

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
  repost_count: number | null
  save_count: number | null
}

type Props = {
  post: PostCardPost
  isLiked: boolean
  isSaved: boolean
  isReposted: boolean
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

export default function PostCard({
  post,
  isLiked: initialIsLiked,
  isSaved,
  isReposted: initialIsReposted,
  currentUserId,
  currentUser = null,
}: Props) {
  const supabase = createClient()
  const [isLiked, setIsLiked] = useState(initialIsLiked)
  const [likeCount, setLikeCount] = useState(post.like_count ?? 0)
  const [pending, setPending] = useState(false)
  const [commentOpen, setCommentOpen] = useState(false)
  const [commentCount, setCommentCount] = useState(post.comment_count ?? 0)
  const [repostDrawerOpen, setRepostDrawerOpen] = useState(false)
  const [isReposted, setIsReposted] = useState(initialIsReposted)
  const [repostCount, setRepostCount] = useState(post.repost_count ?? 0)
  const [saveCount, setSaveCount] = useState(post.save_count ?? 0)

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
        const { error } = await supabase.from('like_').delete()
          .eq('human_id', currentUserId).eq('post_id', post.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('like_')
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
      <article className="mb-5" style={{ borderBottom: '1px solid #F0F0F0' }}>

        {/* Header — single row */}
        <div className="px-3 pt-3 pb-2">
          <div className="flex items-center gap-2.5">
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

            <div className="flex-1 min-w-0">
              <Link href={author.username ? `/${author.username}` : '/'}>
                <p className="text-[13px] font-semibold text-[#0F2240] leading-tight truncate">
                  {author.display_name ?? author.username}
                </p>
              </Link>
              <p className="text-[11px] text-[#0F2240]/45 leading-tight">
                {timeAgo(post.created_at)}
              </p>
            </div>

            {taggedDogs.length > 0 && (
              <div className="flex items-center gap-1 shrink-0">
                {taggedDogs.map(({ dog }) => (
                  <Link
                    key={dog.id}
                    href={author.username ? `/${author.username}/${slugify(dog.name)}` : '/'}
                    aria-label={dog.name}
                    className="relative w-7 h-7 rounded-full overflow-hidden bg-[#EDE3D6] block shrink-0"
                  >
                    {dog.avatar ? (
                      <Image src={dog.avatar} alt={dog.name} fill className="object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-[10px] font-bold text-[#0F2240]/40">
                        {dog.name[0].toUpperCase()}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {post.body && (
            <p className="mt-2 text-sm text-[#0F2240] leading-snug">{post.body}</p>
          )}
        </div>

        {/* Photo */}
        {image && (
          <Link href={`/posts/${post.id}`} className="block px-3">
            <div className="relative w-full aspect-[4/5] rounded-lg overflow-hidden shadow-sm">
              <Image src={image} alt="" fill className="object-cover" />
            </div>
          </Link>
        )}

        {/* Action row */}
        <div className="flex items-center gap-5 px-3 py-3">
          <button
            type="button"
            onClick={handleLike}
            disabled={pending}
            aria-label={isLiked ? 'Unlike' : 'Like'}
            className="flex items-center gap-1.5 transition-transform active:scale-90 disabled:opacity-60"
          >
            <Heart
              className={`h-6 w-6 transition-all ${isLiked ? 'fill-[#0F2240] stroke-[#0F2240]' : 'fill-none stroke-[#0F2240]/60'}`}
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
            <MessageCircle className="h-6 w-6" strokeWidth={1.8} />
            <span className="text-sm">{commentCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setRepostDrawerOpen(true)}
            aria-label={isReposted ? 'Undo repost' : 'Repost'}
            className="flex items-center gap-1.5 transition-colors"
          >
            <Repeat2
              className={`h-6 w-6 ${isReposted ? 'text-green-600' : 'text-[#0F2240]/60'}`}
              strokeWidth={1.8}
            />
            <span className={`text-sm ${isReposted ? 'text-green-600' : 'text-[#0F2240]/60'}`}>
              {repostCount}
            </span>
          </button>

          <div className="flex items-center gap-1.5 ml-auto">
            <BookmarkButton
              postId={post.id}
              initialSaved={isSaved}
              onSaveChange={(saved) => setSaveCount((c) => saved ? c + 1 : c - 1)}
            />
            {saveCount > 0 && (
              <span className="text-sm text-[#0F2240]/60">{saveCount}</span>
            )}
          </div>
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

      <RepostDrawer
        post={post}
        open={repostDrawerOpen}
        isReposted={isReposted}
        onClose={() => setRepostDrawerOpen(false)}
        onRepostedChange={setIsReposted}
        onRepostCountChange={(delta) => setRepostCount((c) => c + delta)}
      />
    </>
  )
}
