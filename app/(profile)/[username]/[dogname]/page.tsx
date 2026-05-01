import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import FollowButton from '@/components/follow-button'
import { slugify } from '@/lib/slugify'

type DogPage = {
  id: string
  name: string
  avatar: string | null
  bio: string | null
  size: string | null
  sex: string | null
  birthday: string | null
  personality_tags: string[] | null
  is_private: boolean
  owner_id: string
  follower_count: number | null
  dog_breeds: {
    is_primary: boolean
    breed: { name: string } | null
  }[]
}

type Owner = {
  id: string
  display_name: string | null
  username: string | null
  avatar: string | null
}

function getAllBreeds(dog: DogPage): string {
  return dog.dog_breeds.map((b) => b.breed?.name).filter(Boolean).join(' / ')
}

export default async function DogProfilePage({
  params,
}: {
  params: Promise<{ username: string; dogname: string }>
}) {
  const { username, dogname } = await params

  const admin = createAdminClient()
  const supabase = await createClient()

  // Resolve owner
  const { data: ownerData } = await admin
    .from('human')
    .select('id, display_name, username, avatar')
    .eq('username', username)
    .maybeSingle()

  if (!ownerData) notFound()

  const owner = ownerData as Owner

  // Find dog by owner, matching [dogname] param as a slug against all owner's dogs
  const { data: dogRows } = await admin
    .from('dog')
    .select(`
      id,
      name,
      avatar,
      bio,
      size,
      sex,
      birthday,
      personality_tags,
      is_private,
      owner_id,
      follower_count,
      dog_breeds(
        is_primary,
        breed:breed(name)
      )
    `)
    .eq('owner_id', owner.id)

  const dog = (dogRows ?? []).find((d) => slugify(d.name) === dogname) ?? null
  if (!dog) notFound()

  const d = dog as DogPage
  const allBreeds = getAllBreeds(d)

  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id ?? null
  const isOwnDog = userId === d.owner_id

  // Check if current user is following this dog
  let isFollowingDog = false
  if (userId && !isOwnDog) {
    const { data: followRow } = await supabase
      .from('follow')
      .select('id')
      .eq('follower_id', userId)
      .eq('target_dog_id', d.id)
      .maybeSingle()
    isFollowingDog = !!followRow
  }

  const { data: postDogs } = await admin
    .from('post_dogs')
    .select('post:post_id ( id, images, created_at, is_private )')
    .eq('dog_id', d.id)
    .order('created_at', { ascending: false, referencedTable: 'post' })

  const dogPosts = (postDogs ?? [])
    .map((r) => r.post as { id: string; images: string[] | null; is_private: boolean } | null)
    .filter((p): p is { id: string; images: string[] | null; is_private: boolean } => p !== null)
    .filter((p) => !p.is_private || isOwnDog)

  return (
    <div className="min-h-svh bg-white">
      <div className="max-w-[640px] mx-auto">

        {/* Cover strip */}
        <div
          className="relative w-full"
          style={{ height: 180, backgroundColor: '#EDE3D6' }}
        >
          {/* Back nav */}
          <Link
            href={`/${owner.username}`}
            className="absolute top-4 left-4 flex items-center gap-1.5 text-sm font-medium text-[#0F2240]/70 hover:text-[#0F2240] transition-colors bg-white/70 backdrop-blur-sm px-3 py-1.5 rounded-full"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            {owner.display_name ?? owner.username}
          </Link>
        </div>

        {/* Avatar + action row — pulled up to overlap cover */}
        <div className="relative z-10 px-4 -mt-12 pb-6">
          <div className="flex items-end justify-between gap-3">
            {/* Avatar */}
            <div
              className="relative w-24 h-24 rounded-full border-4 border-white overflow-hidden bg-[#F7F3EE] shrink-0"
              style={{ boxShadow: '0 2px 8px rgba(15,34,64,0.12)' }}
            >
              {d.avatar ? (
                <Image src={d.avatar} alt={d.name} fill className="object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full text-3xl font-bold text-[#0F2240]/30">
                  {d.name[0].toUpperCase()}
                </div>
              )}
            </div>

            {/* Action button */}
            <div className="shrink-0 pb-1">
              {isOwnDog ? (
                <Link
                  href={`/${username}/${dogname}/edit`}
                  className="text-sm font-medium px-4 py-1.5 rounded-full border border-[#0F2240]/20 text-[#0F2240] hover:bg-[#F7F3EE] transition-colors whitespace-nowrap"
                >
                  Edit {d.name}
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
                  targetType="dog"
                  targetId={d.id}
                  initialFollowing={isFollowingDog}
                  initialFollowerCount={d.follower_count ?? 0}
                  packName={d.name.endsWith('s') ? `${d.name}'` : `${d.name}'s`}
                />
              )}
            </div>
          </div>

          {/* Name / breed / owner / stats */}
          <div className="mt-3">
            <h1 className="text-xl font-bold text-[#0F2240] leading-tight">{d.name}</h1>
            {allBreeds && (
              <p className="text-sm text-[#0F2240]/50 mt-0.5">{allBreeds}</p>
            )}
            <p className="text-sm text-[#0F2240]/40 mt-1">
              by{' '}
              <Link
                href={`/${owner.username}`}
                className="text-[#0F2240]/60 hover:text-[#0F2240] transition-colors"
              >
                @{owner.username}
              </Link>
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-[13px] text-[#0F2240]/50">
              <span>
                <span className="font-semibold text-[#0F2240]">{dogPosts.length}</span> Posts
              </span>
              <span className="select-none">·</span>
              <span>
                <span className="font-semibold text-[#0F2240]">{d.follower_count ?? 0}</span> Followers
              </span>
            </div>
          </div>

          {/* Bio */}
          {d.bio && (
            <p className="mt-3 text-sm text-[#0F2240]/80 leading-relaxed pb-1">{d.bio}</p>
          )}

          {/* Personality tags */}
          {d.personality_tags && d.personality_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {d.personality_tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: '#F7F3EE', color: '#0F2240' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {!d.bio && (!d.personality_tags || d.personality_tags.length === 0) && (
            <div className="pb-4" />
          )}
        </div>

        <div className="border-t border-[#0F2240]/8" />

        {/* Posts section */}
        <div className="py-5">
          <h2 className="text-base font-bold text-[#0F2240] px-4 mb-3">Posts</h2>
          {dogPosts.length > 0 ? (
            <div className="grid grid-cols-3 gap-px">
              {dogPosts.map((post) => {
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
            <p className="text-center text-sm text-[#0F2240]/40 py-8">No posts yet.</p>
          )}
        </div>

      </div>
    </div>
  )
}
