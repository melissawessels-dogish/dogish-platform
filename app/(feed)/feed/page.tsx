import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import PostCard, { type PostCardProps } from '@/components/feed/PostCard'

export const dynamic = 'force-dynamic'

function FeedSkeleton() {
  return (
    <div className="max-w-lg mx-auto px-4 pt-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl bg-zinc-100 animate-pulse h-48 mb-3" />
      ))}
    </div>
  )
}

async function FeedContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Get feed posts via RPC
  const { data: rawPosts } = await supabase.rpc('get_feed', { user_id: user.id })
  const posts = (rawPosts ?? []) as {
    id: string
    author_id: string
    post_type: string | null
    body: string | null
    images: string[] | null
    place_id: string | null
    like_count: number | null
    comment_count: number | null
    created_at: string
  }[]

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center mt-16 px-6 text-center">
        <p className="text-[15px] text-[#0F2240] mb-4">
          Follow some dogs and owners to see their posts here.
        </p>
        <Link
          href="/search"
          className="bg-[#0F2240] text-white rounded-full px-6 py-2 text-sm font-medium"
        >
          Find dogs to follow
        </Link>
      </div>
    )
  }

  // Batch fetch authors
  const authorIds = [...new Set(posts.map((p) => p.author_id))]
  const { data: authorsData } = await admin
    .from('human')
    .select('id, username, display_name, avatar')
    .in('id', authorIds)
  const authorMap = Object.fromEntries(
    (authorsData ?? []).map((a) => [a.id, a])
  ) as Record<string, { id: string; username: string; display_name: string | null; avatar: string | null }>

  // Batch fetch tagged dogs
  const postIds = posts.map((p) => p.id)
  const { data: taggedDogsData } = await admin
    .from('post_dogs')
    .select('post_id, dog:dog_id ( id, name, avatar )')
    .in('post_id', postIds)
  const dogsByPost = {} as Record<string, { id: string; name: string; avatar: string | null }[]>
  for (const row of (taggedDogsData ?? []) as { post_id: string; dog: { id: string; name: string; avatar: string | null } }[]) {
    if (!dogsByPost[row.post_id]) dogsByPost[row.post_id] = []
    dogsByPost[row.post_id].push(row.dog)
  }

  // Batch fetch places
  const placeIds = [...new Set(posts.filter((p) => p.place_id).map((p) => p.place_id as string))]
  const placeMap = {} as Record<string, string>
  if (placeIds.length > 0) {
    const { data: placesData } = await admin
      .from('place')
      .select('id, name')
      .in('id', placeIds)
    for (const place of (placesData ?? []) as { id: string; name: string }[]) {
      placeMap[place.id] = place.name
    }
  }

  // Fetch which posts the current user has liked and saved
  const [likedRowsResult, savedRowsResult] = await Promise.all([
    supabase.from('like_').select('post_id').eq('human_id', user.id).in('post_id', postIds),
    supabase.from('saved_post').select('post_id').eq('human_id', user.id).in('post_id', postIds),
  ])
  const likedSet = new Set((likedRowsResult.data ?? []).map((r) => r.post_id as string))
  const savedSet = new Set((savedRowsResult.data ?? []).map((r) => r.post_id as string))

  // Map to PostCard props
  const cards: PostCardProps[] = posts.map((post) => {
    const author = authorMap[post.author_id] ?? { username: '', display_name: null, avatar: null }
    return {
      id: post.id,
      author: {
        username: author.username ?? '',
        display_name: author.display_name,
        avatar: author.avatar,
      },
      post_type: post.post_type ?? 'photo',
      body: post.body,
      images: post.images,
      place_name: post.place_id ? (placeMap[post.place_id] ?? null) : null,
      like_count: post.like_count ?? 0,
      comment_count: post.comment_count ?? 0,
      created_at: post.created_at,
      dogs: dogsByPost[post.id] ?? [],
      isLiked: likedSet.has(post.id),
      isSaved: savedSet.has(post.id),
    }
  })

  return (
    <div className="max-w-lg mx-auto px-4 pt-4">
      {cards.map((card) => (
        <PostCard key={card.id} {...card} />
      ))}
    </div>
  )
}

export default function FeedPage() {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <FeedContent />
    </Suspense>
  )
}
