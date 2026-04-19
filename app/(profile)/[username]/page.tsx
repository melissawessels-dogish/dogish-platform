export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import FollowButton from '@/components/follow-button'

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
    .select('id, display_name, username, avatar, bio, location, follower_count, following_count')
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

  const { data: kitsRaw } = await admin
    .from('kit')
    .select('id, title, type, is_private')
    .eq('owner_id', h.id)
    .order('created_at', { ascending: false })

  const kitList = ((kitsRaw ?? []) as { id: string; title: string; type: string | null; is_private: boolean }[])
    .filter((k) => isOwnProfile || !k.is_private)

  const showKitsSection = kitList.length > 0 || isOwnProfile

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
              ) : !user ? (
                <Link
                  href="/login"
                  className="text-[13px] font-semibold px-6 py-1.5 rounded-full bg-[#0F2240] text-white hover:bg-[#0F2240]/90 transition-colors whitespace-nowrap"
                >
                  Join their pack
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
              <span className="font-semibold text-[#0F2240]">{h.following_count ?? 0}</span> Following
            </span>
          </div>
        </div>

        <div className="border-t border-[#0F2240]/8" />

        {/* Posts grid */}
        <div className={`mt-6 px-4 ${showKitsSection ? 'pb-4' : 'pb-24'}`}>
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

        {/* Kits section */}
        {showKitsSection && (
          <>
            <div className="border-t border-[#0F2240]/8" />
            <div className="px-4 pt-5 pb-24">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[15px] font-semibold text-[#0F2240]">Kits</h2>
                {isOwnProfile && kitList.length > 0 && (
                  <Link
                    href="/kits/new"
                    className="text-[13px] font-semibold px-3 py-1 rounded-full text-white transition-colors"
                    style={{ backgroundColor: '#0F2240' }}
                  >
                    + New kit
                  </Link>
                )}
              </div>
              {kitList.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {kitList.map((kit) => (
                    <Link
                      key={kit.id}
                      href={`/${username}/kits/${kit.id}`}
                      className="group rounded-xl overflow-hidden border border-[#0F2240]/10 hover:border-[#0F2240]/25 transition-colors"
                    >
                      <div
                        className="w-full flex items-center justify-center"
                        style={{ aspectRatio: '16/9', backgroundColor: '#0F2240' }}
                      >
                        <span className="text-white/20 text-2xl font-bold select-none">
                          {kit.title[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div className="px-3 py-2.5 bg-white">
                        <p className="text-sm font-semibold text-[#0F2240] truncate">{kit.title}</p>
                        {kit.type && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F7F3EE] text-[#0F2240]/60 capitalize">
                            {kit.type}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-[14px] text-[#0F2240]/40 mb-3">No kits yet.</p>
                  <Link
                    href="/kits/new"
                    className="text-sm font-medium px-4 py-1.5 rounded-full text-white"
                    style={{ backgroundColor: '#0F2240' }}
                  >
                    Create your first kit
                  </Link>
                </div>
              )}
            </div>
          </>
        )}

      </div>

    </div>
  )
}
