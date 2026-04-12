import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import FollowButton from '@/components/FollowButton'

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
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: human } = await admin
    .from('human')
    .select('id, display_name, username, avatar, bio, location, follower_count')
    .eq('username', username)
    .maybeSingle()

  if (!human) {
    notFound()
  }

  const h = human as Human

  const { data: { user } } = await supabase.auth.getUser()

  // Look up the session user's own username to determine ownership
  let myUsername: string | null = null
  if (user) {
    const { data: me } = await admin
      .from('human')
      .select('username')
      .eq('id', user.id)
      .maybeSingle()
    myUsername = me?.username ?? null
  }
  const isOwnProfile = !!myUsername && myUsername.toLowerCase() === username.toLowerCase()

  // Check if current user is following this human
  let isFollowing = false
  if (user && !isOwnProfile) {
    const { data: followRow } = await supabase
      .from('follow')
      .select('id')
      .eq('follower_id', user.id)
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

  const followerCount = h.follower_count ?? 0

  return (
    <div className="min-h-svh bg-white">
      <div className="max-w-[640px] mx-auto">

        {/* Cover strip — pointer-events-none so it never intercepts clicks below */}
        <div className="w-full pointer-events-none" style={{ height: 160, backgroundColor: '#EDE3D6' }} />

        {/* Avatar row — -mt-10 pulls row up by 40px (half of 80px avatar height) */}
        <div className="relative z-10 px-4 -mt-10">
          <div className="flex items-start gap-2">

            {/* Human avatar (not a link) */}
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
                href={`/${username}/${dog.name.toLowerCase()}`}
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
              ) : (
                <FollowButton
                  targetType="human"
                  targetId={h.id}
                  targetUsername={h.username}
                  isFollowing={isFollowing}
                  followerCount={followerCount}
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
          <div className="flex items-center gap-1.5 mt-2 text-[13px] text-[#0F2240]/50">
            <span>
              <span className="font-semibold text-[#0F2240]">{postList.length}</span> Posts
            </span>
            <span className="select-none">·</span>
            <span>
              <span className="font-semibold text-[#0F2240]">{followerCount}</span> Followers
            </span>
            <span className="select-none">·</span>
            <span>
              <span className="font-semibold text-[#0F2240]">0</span> Following
            </span>
          </div>
        </div>

        <div className="border-t border-[#0F2240]/8" />

        {/* Posts grid */}
        <div className="mt-6 px-4 pb-24">
          <h2 className="text-[15px] font-semibold text-[#0F2240] mb-3">Posts</h2>
          {postList.length > 0 ? (
            <div className="grid grid-cols-3 gap-px">
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

      </div>

      {/* Floating new post button — own profile only */}
      {isOwnProfile && (
        <Link
          href="/posts/new"
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
          style={{ backgroundColor: '#0F2240' }}
          aria-label="New post"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </Link>
      )}
    </div>
  )
}
