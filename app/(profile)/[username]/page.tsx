export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import FollowButton from '@/components/follow-button'
import ProfileStats from '@/components/profile-stats'
import { slugify } from '@/lib/slugify'

type Dog = {
  id: string
  name: string
  avatar: string | null
}

type Human = {
  id: string
  display_name: string | null
  username: string | null
  avatar: string | null
  bio: string | null
  location: string | null
  follower_count: number | null
  following_count: number | null
}

type Kit = {
  id: string
  title: string
  type: string | null
  is_private: boolean
  is_system: boolean
}

const TABS = ['posts', 'kits'] as const
type TabValue = typeof TABS[number]

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { username } = await params
  const { tab: tabParam = 'posts' } = await searchParams
  const activeTab: TabValue = (TABS as readonly string[]).includes(tabParam)
    ? (tabParam as TabValue)
    : 'posts'

  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: human } = await admin
    .from('human')
    .select('id, display_name, username, avatar, bio, location, follower_count, following_count')
    .eq('username', username)
    .maybeSingle()

  if (!human) {
    notFound()
  }

  const h = human as Human

  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id ?? null
  const isOwnProfile = userId === h.id

  // Check if current user is following this human
  let isFollowing = false
  if (userId && !isOwnProfile) {
    const { data: followRow } = await supabase
      .from('follow')
      .select('id')
      .eq('follower_id', userId)
      .eq('target_human_id', h.id)
      .maybeSingle()
    isFollowing = !!followRow
  }

  const { data: dogs } = await admin
    .from('dog')
    .select('id, name, avatar')
    .eq('owner_id', h.id)

  const dogList: Dog[] = (dogs ?? []) as Dog[]

  const { data: posts } = await admin
    .from('post')
    .select('id, images')
    .eq('author_id', h.id)
    .eq('is_private', false)
    .order('created_at', { ascending: false })

  const postList = (posts ?? []) as { id: string; images: string[] | null }[]

  const { data: kitsRaw } = await admin
    .from('kit')
    .select('id, title, type, is_private, is_system')
    .eq('owner_id', h.id)
    .order('is_system', { ascending: false })
    .order('created_at', { ascending: true })

  const kitList = ((kitsRaw ?? []) as Kit[])
    .filter((k) => isOwnProfile || !k.is_private)

  // Fetch one cover image per kit: most recently added post item
  const coverImageMap: Record<string, string> = {}
  if (kitList.length > 0) {
    const { data: coverItems } = await admin
      .from('kit_items')
      .select('pack_id, post:post_id(images), added_at')
      .in('pack_id', kitList.map((k) => k.id))
      .eq('item_type', 'post')
      .order('added_at', { ascending: false })

    for (const row of (coverItems ?? []) as unknown as { pack_id: string; post: { images: string[] | null } | null; added_at: string }[]) {
      if (!coverImageMap[row.pack_id] && row.post?.images?.[0]) {
        coverImageMap[row.pack_id] = row.post.images[0]
      }
    }
  }

  const followerCount = h.follower_count ?? 0

  return (
    <div className="min-h-svh bg-white">
      <div className="max-w-[640px] mx-auto">

        {/* Cover strip */}
        <div className="w-full pointer-events-none" style={{ height: 160, backgroundColor: '#EDE3D6' }} />

        {/* Avatar row */}
        <div className="relative z-10 px-4 -mt-10">
          <div className="flex items-start gap-2">

            {/* Human avatar */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className="relative w-20 h-20 rounded-full border-[3px] border-white overflow-hidden bg-[#EDE3D6]"
                style={{ boxShadow: '0 1px 6px rgba(15,34,64,0.12)' }}
              >
                {h.avatar ? (
                  <Image src={h.avatar} alt={h.display_name ?? 'Profile'} fill className="object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-2xl font-bold text-[#0F2240]/40">
                    {(h.display_name ?? h.username ?? '?')[0].toUpperCase()}
                  </div>
                )}
              </div>
              <span className="block text-[12px] font-medium text-[#0F2240] leading-tight text-center w-20 overflow-hidden text-ellipsis whitespace-nowrap mt-1">
                {h.display_name ?? h.username ?? ''}
              </span>
            </div>

            {/* Dog avatars */}
            {dogList.map((dog) => (
              <Link
                key={dog.id}
                href={`/${username}/${slugify(dog.name)}`}
                className="flex flex-col items-center gap-1 shrink-0 group"
              >
                <div
                  className="relative w-20 h-20 rounded-full border-[3px] border-white overflow-hidden bg-[#EDE3D6] cursor-pointer ring-offset-0 group-hover:ring-2 group-hover:ring-[#0F2240] transition-all"
                  style={{ boxShadow: '0 1px 6px rgba(15,34,64,0.12)' }}
                >
                  {dog.avatar ? (
                    <Image src={dog.avatar} alt={dog.name} fill className="object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-2xl font-bold text-[#0F2240]/40">
                      {dog.name[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="block text-[12px] font-medium text-[#0F2240] leading-tight text-center w-20 overflow-hidden text-ellipsis whitespace-nowrap underline underline-offset-2 mt-1">
                  {dog.name}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Profile info */}
        <div className="relative z-10 px-4 mt-6 pb-4">

          {/* Display name + action button */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {h.display_name && (
                <h1 className="text-[20px] font-bold text-[#0F2240] leading-tight truncate">
                  {h.display_name}
                </h1>
              )}
              {h.username && (
                <p className="text-[14px] text-[#0F2240]/50 mt-0.5">@{h.username}</p>
              )}
            </div>
            <div className="shrink-0 mt-1">
              {isOwnProfile ? (
                <Link
                  href="/settings/profile"
                  className="text-[13px] font-medium px-4 py-1.5 rounded-full border border-[#0F2240]/25 text-[#0F2240] hover:bg-[#F7F3EE] transition-colors whitespace-nowrap"
                >
                  Edit profile
                </Link>
              ) : !userId ? (
                <Link
                  href="/login"
                  className="text-[13px] font-semibold px-6 py-1.5 rounded-full bg-[#0F2240] text-white hover:bg-[#0F2240]/90 transition-colors whitespace-nowrap"
                >
                  Follow
                </Link>
              ) : (
                <FollowButton
                  targetType="human"
                  targetId={h.id}
                  targetUsername={h.username ?? ''}
                  initialFollowing={isFollowing}
                  initialFollowerCount={followerCount}
                />
              )}
            </div>
          </div>

          {/* Location */}
          {h.location && (
            <div className="flex items-center gap-1.5 mt-2 text-[13px] text-[#0F2240]/55">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                <path d="M20 10c0 6-8 13-8 13s-8-7-8-13a8 8 0 0 1 16 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {h.location}
            </div>
          )}

          {/* Bio */}
          {h.bio && (
            <p className="mt-2 text-[14px] text-[#0F2240]/80 leading-relaxed">{h.bio}</p>
          )}

          {/* Stats */}
          <ProfileStats
            profileUsername={username}
            postCount={postList.length}
            followerCount={followerCount}
            followingCount={h.following_count ?? 0}
          />
        </div>

        {/* Tabs */}
        <div className="border-t border-[#0F2240]/8 px-4">
          <div className="flex gap-6">
            {TABS.map((tab) => (
              <Link
                key={tab}
                href={`/${username}?tab=${tab}`}
                className="pb-3 pt-3 text-[14px] font-medium transition-colors relative capitalize"
                style={{ color: activeTab === tab ? '#0F2240' : 'rgba(15,34,64,0.4)' }}
              >
                {tab}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0F2240] rounded-full" />
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {activeTab === 'posts' && (
          <div className="px-4 pt-5 pb-24">
            {postList.length > 0 ? (
              <div className="grid grid-cols-3 gap-px -mx-4">
                {postList.map((post) => {
                  const img = post.images?.[0]
                  return (
                    <Link key={post.id} href={`/posts/${post.id}`} className="group block">
                      <div className="relative w-full aspect-[4/5] overflow-hidden bg-[#F7F3EE]">
                        {img && (
                          <Image
                            src={img}
                            alt=""
                            fill
                            className="object-cover group-hover:opacity-90 transition-opacity"
                          />
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <p className="text-center text-[14px] text-[#0F2240]/40 py-10">No posts yet.</p>
            )}
          </div>
        )}

        {activeTab === 'kits' && (
          <div className="px-4 pt-5 pb-24">
            <div className="flex items-center justify-between mb-4">
              <span />
              {isOwnProfile && (
                <Link
                  href="/kits/new"
                  className="text-[13px] font-semibold px-3 py-1 rounded-full text-white"
                  style={{ backgroundColor: '#0F2240' }}
                >
                  + New kit
                </Link>
              )}
            </div>
            {kitList.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {kitList.map((kit) => {
                  const coverImage = coverImageMap[kit.id] ?? null
                  return (
                  <Link
                    key={kit.id}
                    href={`/${username}/kits/${kit.id}`}
                    className="group rounded-xl overflow-hidden border border-[#0F2240]/10 hover:border-[#0F2240]/25 transition-colors"
                  >
                    <div
                      className="relative w-full flex items-center justify-center"
                      style={{ aspectRatio: '16/9', backgroundColor: coverImage ? undefined : (kit.is_system ? '#EDE3D6' : '#0F2240') }}
                    >
                      {coverImage ? (
                        <Image src={coverImage} alt={kit.title} fill className="object-cover" />
                      ) : (
                        <span
                          className="text-2xl font-bold select-none"
                          style={{ color: kit.is_system ? 'rgba(15,34,64,0.3)' : 'rgba(255,255,255,0.2)' }}
                        >
                          {kit.title[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="px-3 py-2.5 bg-white">
                      <p className="text-sm font-semibold text-[#0F2240] truncate">{kit.title}</p>
                      {kit.is_private ? (
                        <span className="inline-flex items-center gap-1 mt-1 text-[#0F2240]/35">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        </span>
                      ) : !kit.is_system && kit.type ? (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F7F3EE] text-[#0F2240]/60 capitalize">
                          {kit.type}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                  )
                })}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-[14px] text-[#0F2240]/40 mb-3">No kits yet.</p>
                {isOwnProfile && (
                  <Link
                    href="/kits/new"
                    className="text-sm font-medium px-4 py-1.5 rounded-full text-white"
                    style={{ backgroundColor: '#0F2240' }}
                  >
                    Create your first kit
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
