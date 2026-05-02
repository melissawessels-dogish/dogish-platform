import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Repeat2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import PostCard, { type PostCardPost } from '@/components/PostCard'
import StoryRow, { type StoryGroup } from '@/components/StoryRow'
import type { Story } from '@/components/StoryViewer'
import HomeTabsClient from './HomeTabsClient'

const POST_SELECT = `
  id, body, images, created_at, like_count, comment_count, repost_count, save_count,
  author:human!author_id ( id, display_name, username, avatar ),
  post_dogs ( dog ( id, name, avatar ) )
`

type RawPost = PostCardPost & { is_private?: boolean }

type Reposter = { id: string; username: string | null; display_name: string | null }

type FeedItem =
  | { type: 'post'; sortAt: string; post: PostCardPost }
  | { type: 'repost'; sortAt: string; repostId: string; reposter: Reposter; caption: string | null; post: PostCardPost }

export default async function FeedPage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('human')
    .select('id, username, display_name, avatar')
    .eq('id', user.id)
    .maybeSingle()

  const [followedHumansRes, followedDogsRes] = await Promise.all([
    supabase.from('follow').select('target_human_id')
      .eq('follower_id', user.id).eq('target_type', 'human').not('target_human_id', 'is', null),
    supabase.from('follow').select('target_dog_id')
      .eq('follower_id', user.id).eq('target_type', 'dog').not('target_dog_id', 'is', null),
  ])

  const humanIds = (followedHumansRes.data ?? []).map((r) => r.target_human_id as string)
  const dogIds = (followedDogsRes.data ?? []).map((r) => r.target_dog_id as string)

  // ── Posts ───────────────────────────────────────────────────────────────────

  let rawPosts: PostCardPost[] = []

  if (humanIds.length > 0 || dogIds.length > 0) {
    const humanPostsPromise = humanIds.length > 0
      ? admin.from('post').select(POST_SELECT)
          .in('author_id', humanIds).eq('is_private', false)
          .order('created_at', { ascending: false }).limit(50)
      : Promise.resolve({ data: [] })

    const dogPostIdsPromise = dogIds.length > 0
      ? admin.from('post_dogs').select('post_id').in('dog_id', dogIds)
      : Promise.resolve({ data: [] })

    const [humanPostsResult, dogPostIdsResult] = await Promise.all([humanPostsPromise, dogPostIdsPromise])
    const humanPosts = (humanPostsResult.data ?? []) as unknown as RawPost[]
    const dogPostIds = ((dogPostIdsResult.data ?? []) as { post_id: string }[]).map((r) => r.post_id)

    const existingIds = new Set(humanPosts.map((p) => p.id))
    const newDogPostIds = dogPostIds.filter((id) => !existingIds.has(id))

    let dogTaggedPosts: RawPost[] = []
    if (newDogPostIds.length > 0) {
      const { data } = await admin.from('post').select(POST_SELECT)
        .in('id', newDogPostIds).eq('is_private', false)
        .order('created_at', { ascending: false }).limit(50)
      dogTaggedPosts = (data ?? []) as unknown as RawPost[]
    }

    rawPosts = [...humanPosts, ...dogTaggedPosts]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 50) as PostCardPost[]
  }

  // ── Reposts from followed humans ────────────────────────────────────────────

  type RawRepost = {
    id: string
    caption: string | null
    created_at: string
    reposter: Reposter
    post: PostCardPost
  }

  let reposts: RawRepost[] = []
  if (humanIds.length > 0) {
    const { data } = await admin
      .from('repost')
      .select(`id, caption, created_at, reposter:human!reposter_id(id, username, display_name), post:post!original_post_id(${POST_SELECT})`)
      .in('reposter_id', humanIds)
      .order('created_at', { ascending: false })
      .limit(30)
    reposts = (data ?? []) as unknown as RawRepost[]
  }

  // ── Merge into unified feed ─────────────────────────────────────────────────

  const postItems: FeedItem[] = rawPosts.map((p) => ({
    type: 'post',
    sortAt: p.created_at,
    post: p,
  }))

  const repostItems: FeedItem[] = reposts
    .filter((r) => r.post != null)
    .map((r) => ({
      type: 'repost',
      sortAt: r.created_at,
      repostId: r.id,
      reposter: r.reposter,
      caption: r.caption,
      post: r.post,
    }))

  const feedItems: FeedItem[] = [...postItems, ...repostItems]
    .sort((a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime())
    .slice(0, 60)

  // ── Stories ─────────────────────────────────────────────────────────────────

  const storyAuthorIds = [user.id, ...humanIds]
  type RawStory = {
    id: string; media_url: string; media_type: string; caption: string | null
    author_id: string
    author: { id: string; username: string | null; display_name: string | null; avatar: string | null }
    dog: { name: string } | null
  }
  let storyGroups: StoryGroup[] = []
  if (storyAuthorIds.length > 0) {
    const { data: rawStories } = await admin
      .from('story')
      .select('id, media_url, media_type, caption, author_id, author:human!author_id(id, username, display_name, avatar), dog:dog!dog_id(name)')
      .in('author_id', storyAuthorIds)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true })

    const allStoryIds = ((rawStories ?? []) as unknown as RawStory[]).map((s) => s.id)
    const seenIds = new Set<string>()
    if (allStoryIds.length > 0) {
      const { data: views } = await supabase.from('story_view').select('story_id').in('story_id', allStoryIds)
      for (const v of views ?? []) seenIds.add(v.story_id)
    }

    const groupMap = new Map<string, StoryGroup>()
    for (const s of (rawStories ?? []) as unknown as RawStory[]) {
      if (!groupMap.has(s.author_id)) {
        groupMap.set(s.author_id, { author: s.author, stories: [], hasUnseen: false, isOwn: s.author_id === user.id })
      }
      const g = groupMap.get(s.author_id)!
      const story: Story = { id: s.id, media_url: s.media_url, media_type: s.media_type, caption: s.caption, author: s.author, dog: s.dog }
      g.stories.push(story)
      if (!seenIds.has(s.id)) g.hasUnseen = true
    }
    storyGroups = Array.from(groupMap.values())
  }

  // ── Per-post viewer state (liked / saved / reposted) ────────────────────────

  const allPostIds = [...new Set(feedItems.map((item) => item.post.id))]
  const likedPostIds = new Set<string>()
  const savedPostIds = new Set<string>()
  const repostedPostIds = new Set<string>()

  if (allPostIds.length > 0) {
    const [likedRows, savedKitResult, repostRows] = await Promise.all([
      supabase.from('like_').select('post_id').eq('human_id', user.id).in('post_id', allPostIds),
      supabase.from('kit').select('id').eq('owner_id', user.id).eq('title', 'Saved').limit(1).maybeSingle(),
      supabase.from('repost').select('original_post_id').eq('reposter_id', user.id).in('original_post_id', allPostIds),
    ])
    for (const row of likedRows.data ?? []) likedPostIds.add(row.post_id)
    for (const row of repostRows.data ?? []) repostedPostIds.add(row.original_post_id as string)
    if (savedKitResult.data?.id) {
      const { data: savedItems } = await supabase
        .from('kit_items').select('post_id')
        .eq('pack_id', savedKitResult.data.id).in('post_id', allPostIds)
      for (const row of savedItems ?? []) savedPostIds.add(row.post_id)
    }
  }

  const isEmpty = feedItems.length === 0

  return (
    <div className="min-h-svh bg-white pb-16">
      <div className="max-w-[380px] mx-auto">

        {/* Sticky top bar: Wordmark + Avatar */}
        <div className="sticky top-0 z-50 bg-white flex items-center justify-between pt-4 pb-2 px-3 border-b border-[#F0F0F0]">
          <div className="w-9" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/dogish-wordmark.svg" alt="Dogish" style={{ height: 26 }} />
          <div className="w-9 flex justify-end">
            <Link href={`/${me?.username ?? '/onboarding/profile'}`} aria-label="Profile">
              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-[#F7F3EE] flex items-center justify-center">
                {me?.avatar ? (
                  <Image src={me.avatar} alt={me.display_name ?? me.username ?? ''} fill className="object-cover" />
                ) : (
                  <span className="text-[11px] font-bold text-[#0F2240]">
                    {(me?.display_name ?? me?.username ?? '?')[0].toUpperCase()}
                  </span>
                )}
              </div>
            </Link>
          </div>
        </div>

        {/* Feed / Reels toggle + content */}
        <HomeTabsClient>
          <>
            {storyGroups.length > 0 && (
              <StoryRow
                groups={storyGroups}
                currentUserId={user.id}
                currentUserAvatar={me?.avatar ?? null}
              />
            )}

            {isEmpty ? (
              <div className="flex flex-col items-center gap-3 py-20 px-6 text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: '#EDE3D6' }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0F2240" strokeWidth="1.5" opacity="0.5">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
                <p className="text-[15px] font-semibold text-[#0F2240]">Your feed is empty.</p>
                <p className="text-[13px] text-[#0F2240]/50">Find people and dogs to follow.</p>
                <Link href="/discover" className="mt-2 text-[13px] font-semibold px-5 py-2 rounded-full text-white" style={{ backgroundColor: '#0F2240' }}>
                  Discover
                </Link>
              </div>
            ) : (
              <div className="flex flex-col">
                {feedItems.map((item) => {
                  const post = item.post
                  const commonProps = {
                    post,
                    isLiked: likedPostIds.has(post.id),
                    isSaved: savedPostIds.has(post.id),
                    isReposted: repostedPostIds.has(post.id),
                    currentUserId: user.id,
                    currentUser: me ?? null,
                  }

                  if (item.type === 'post') {
                    return <PostCard key={post.id} {...commonProps} />
                  }

                  return (
                    <div key={item.repostId}>
                      <div className="flex items-center gap-1.5 px-4 pt-3 pb-0">
                        <Repeat2 className="h-3.5 w-3.5 text-[#0F2240]/40 shrink-0" />
                        <span className="text-[12px] text-[#0F2240]/40 font-medium">
                          {item.reposter.display_name ?? item.reposter.username} reposted
                        </span>
                      </div>
                      {item.caption && (
                        <div className="px-4 pt-2 pb-1">
                          <p className="text-[14px] text-[#0F2240] leading-snug">{item.caption}</p>
                        </div>
                      )}
                      <PostCard key={`${item.repostId}-post`} {...commonProps} />
                    </div>
                  )
                })}
              </div>
            )}
          </>
        </HomeTabsClient>

      </div>
    </div>
  )
}
