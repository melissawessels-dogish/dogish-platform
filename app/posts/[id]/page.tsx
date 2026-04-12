import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

type Author = {
  id: string
  display_name: string | null
  username: string | null
  avatar: string | null
}

type TaggedDog = {
  dog: {
    id: string
    name: string
    avatar: string | null
  }
}

type Post = {
  id: string
  body: string | null
  images: string[] | null
  created_at: string
  like_count: number | null
  comment_count: number | null
  author: Author
  post_dogs: TaggedDog[]
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`
  const years = Math.floor(days / 365)
  return `${years} year${years === 1 ? '' : 's'} ago`
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const admin = createAdminClient()

  const { data: post } = await admin
    .from('post')
    .select(`
      id,
      body,
      images,
      created_at,
      like_count,
      comment_count,
      author:human!author_id (
        id,
        display_name,
        username,
        avatar
      ),
      post_dogs (
        dog (
          id,
          name,
          avatar
        )
      )
    `)
    .eq('id', id)
    .maybeSingle()

  if (!post) {
    notFound()
  }

  const p = post as unknown as Post
  const author = p.author
  const taggedDogs = p.post_dogs ?? []
  const image = p.images?.[0] ?? null
  const likeCount = p.like_count ?? 0
  const commentCount = p.comment_count ?? 0

  return (
    <div className="min-h-svh bg-white">
      <div className="max-w-[640px] mx-auto">

        {/* Back navigation */}
        <div className="px-4 pt-4 pb-2">
          <Link
            href={author.username ? `/${author.username}` : '/'}
            className="inline-flex items-center gap-1.5 text-[13px] text-[#0F2240]/60 hover:text-[#0F2240] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {author.display_name ?? author.username ?? 'Profile'}
          </Link>
        </div>

        {/* Author row */}
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-full overflow-hidden bg-[#EDE3D6] shrink-0">
            {author.avatar ? (
              <Image src={author.avatar} alt={author.display_name ?? 'Author'} fill className="object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full text-sm font-bold text-[#0F2240]/40">
                {(author.display_name ?? author.username ?? '?')[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-[#0F2240] leading-tight truncate">
              {author.display_name ?? author.username}
            </p>
            {author.username && (
              <p className="text-[12px] text-[#0F2240]/45 leading-tight">
                @{author.username} · {timeAgo(p.created_at)}
              </p>
            )}
          </div>
        </div>

        {/* Photo */}
        {image && (
          <div className="relative w-full aspect-[4/5] max-h-[85vh] overflow-hidden bg-[#F7F3EE]">
            <Image src={image} alt="" fill className="object-cover" priority />
          </div>
        )}

        {/* Actions + stats */}
        <div className="px-4 pt-3 pb-1">
          {/* Like and comment buttons */}
          <div className="flex items-center gap-4 mb-2">
            <button
              type="button"
              className="flex items-center gap-1.5 text-[#0F2240]/60 hover:text-[#0F2240] transition-colors"
              aria-label="Like"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 text-[#0F2240]/60 hover:text-[#0F2240] transition-colors"
              aria-label="Comment"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          </div>

          {/* Like + comment counts */}
          <p className="text-[12px] text-[#0F2240]/45">
            <span className="font-semibold text-[#0F2240]">{likeCount}</span> like{likeCount !== 1 ? 's' : ''}
            {' · '}
            <span className="font-semibold text-[#0F2240]">{commentCount}</span> comment{commentCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Tagged dogs */}
        {taggedDogs.length > 0 && (
          <div className="px-4 pt-2 pb-1 flex items-center gap-3">
            {taggedDogs.map(({ dog }) => (
              <Link
                key={dog.id}
                href={author.username ? `/${author.username}/${dog.name.toLowerCase()}` : '/'}
                className="flex items-center gap-1.5 group"
              >
                <div className="relative w-7 h-7 rounded-full overflow-hidden bg-[#EDE3D6] shrink-0 group-hover:ring-2 group-hover:ring-[#0F2240] transition-all">
                  {dog.avatar ? (
                    <Image src={dog.avatar} alt={dog.name} fill className="object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs font-bold text-[#0F2240]/40">
                      {dog.name[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-[13px] font-medium text-[#0F2240] underline underline-offset-2 group-hover:text-[#0F2240]/70 transition-colors">
                  {dog.name}
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* Caption */}
        {p.body && (
          <div className="px-4 pt-2 pb-5">
            <p className="text-[14px] text-[#0F2240]/85 leading-relaxed">
              <span className="font-semibold text-[#0F2240] mr-1">
                {author.username}
              </span>
              {p.body}
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
