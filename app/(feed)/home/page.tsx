import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import BottomNav from '@/components/BottomNav'
import PostCard, { type PostCardPost } from '@/components/PostCard'
import SignOutButton from '@/components/SignOutButton'

export default async function FeedPage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get current user's human row
  const { data: me } = await supabase
    .from('human')
    .select('id, username')
    .eq('id', user.id)
    .maybeSingle()

  // Get IDs of humans the user follows
  const { data: followedHumans } = await supabase
    .from('follow')
    .select('target_human_id')
    .eq('follower_id', user.id)
    .eq('target_type', 'human')
    .not('target_human_id', 'is', null)

  // Get IDs of dogs the user follows
  const { data: followedDogs } = await supabase
    .from('follow')
    .select('target_dog_id')
    .eq('follower_id', user.id)
    .eq('target_type', 'dog')
    .not('target_dog_id', 'is', null)

  const humanIds = (followedHumans ?? []).map((r) => r.target_human_id as string)
  const dogIds = (followedDogs ?? []).map((r) => r.target_dog_id as string)

  let posts: PostCardPost[] = []

  if (humanIds.length > 0 || dogIds.length > 0) {
    const humanPostsPromise = humanIds.length > 0
      ? admin
          .from('post')
          .select(`
            id, body, images, created_at, like_count, comment_count,
            author:human!author_id ( id, display_name, username, avatar ),
            post_dogs ( dog ( id, name, avatar ) )
          `)
          .in('author_id', humanIds)
          .eq('is_private', false)
          .order('created_at', { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [] })

    const dogPostIdsPromise = dogIds.length > 0
      ? admin
          .from('post_dogs')
          .select('post_id')
          .in('dog_id', dogIds)
      : Promise.resolve({ data: [] })

    const [humanPostsResult, dogPostIdsResult] = await Promise.all([
      humanPostsPromise,
      dogPostIdsPromise,
    ])

    const humanPosts = (humanPostsResult.data ?? []) as unknown as PostCardPost[]
    const dogPostIds = ((dogPostIdsResult.data ?? []) as { post_id: string }[]).map((r) => r.post_id)

    const existingIds = new Set(humanPosts.map((p) => p.id))
    const newDogPostIds = dogPostIds.filter((id) => !existingIds.has(id))

    let dogTaggedPosts: PostCardPost[] = []
    if (newDogPostIds.length > 0) {
      const { data } = await admin
        .from('post')
        .select(`
          id, body, images, created_at, like_count, comment_count,
          author:human!author_id ( id, display_name, username, avatar ),
          post_dogs ( dog ( id, name, avatar ) )
        `)
        .in('id', newDogPostIds)
        .eq('is_private', false)
        .order('created_at', { ascending: false })
        .limit(50)
      dogTaggedPosts = (data ?? []) as unknown as PostCardPost[]
    }

    posts = [...humanPosts, ...dogTaggedPosts]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 50)
  }

  // Check which posts the current user has liked and saved
  const likedPostIds = new Set<string>()
  const savedPostIds = new Set<string>()
  if (posts.length > 0) {
    const postIds = posts.map((p) => p.id)
    const [likedRows, savedRows] = await Promise.all([
      supabase.from('like_').select('post_id').eq('human_id', user.id).in('post_id', postIds),
      supabase.from('saved_post').select('post_id').eq('human_id', user.id).in('post_id', postIds),
    ])
    for (const row of likedRows.data ?? []) likedPostIds.add(row.post_id)
    for (const row of savedRows.data ?? []) savedPostIds.add(row.post_id)
  }

  return (
    <div className="min-h-svh bg-white pb-16">
      <div className="max-w-[380px] mx-auto">

        {/* Wordmark */}
        <div className="flex items-center justify-between pt-4 pb-2 px-3 border-b border-[#F0F0F0]">
          <div className="w-16" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/dogish-wordmark.svg" alt="Dogish" style={{ height: 26 }} />
          <div className="w-16 flex justify-end">
            <SignOutButton />
          </div>
        </div>

        {posts.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center gap-3 py-20 px-6 text-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#EDE3D6' }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0F2240" strokeWidth="1.5" opacity="0.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <p className="text-[15px] font-semibold text-[#0F2240]">Your feed is empty.</p>
            <p className="text-[13px] text-[#0F2240]/50">Find people and dogs to follow.</p>
            <Link
              href="/search"
              className="mt-2 text-[13px] font-semibold px-5 py-2 rounded-full text-white"
              style={{ backgroundColor: '#0F2240' }}
            >
              Discover
            </Link>
          </div>
        ) : (
          <div className="flex flex-col">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isLiked={likedPostIds.has(post.id)}
                isSaved={savedPostIds.has(post.id)}
                currentUserId={user.id}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav username={me?.username ?? null} />
    </div>
  )
}
