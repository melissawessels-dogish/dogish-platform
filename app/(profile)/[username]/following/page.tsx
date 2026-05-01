export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { HumanFollowButton, UnfollowDogButton, UnfollowBreedButton } from '@/components/follow-toggle-button'
import { slugify } from '@/lib/slugify'

type FollowedHuman = {
  id: string
  display_name: string | null
  username: string | null
  avatar: string | null
}

type FollowedDog = {
  follow_id: string
  dog: {
    id: string
    name: string
    avatar: string | null
    owner: { username: string | null } | null
  }
}

type FollowedBreed = {
  follow_id: string
  breed: {
    id: string
    name: string
  }
}

function SectionHeader({ title }: { title: string }) {
  return (
    <p className="text-[11px] font-semibold text-[#0F2240]/40 uppercase tracking-wider pt-5 pb-2">
      {title}
    </p>
  )
}

export default async function FollowingPage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: profileHuman } = await admin
    .from('human')
    .select('id, display_name')
    .eq('username', username)
    .maybeSingle()

  if (!profileHuman) notFound()

  const { data: { session } } = await supabase.auth.getSession()
  const currentUserId = session?.user?.id ?? null
  const isOwnProfile = currentUserId === profileHuman.id

  // Fetch followed people, dogs, breeds in parallel
  const [peopleRes, dogsRes, breedsRes] = await Promise.all([
    admin
      .from('follow')
      .select('id, human:human!target_human_id(id, display_name, username, avatar)')
      .eq('follower_id', profileHuman.id)
      .eq('target_type', 'human')
      .order('created_at', { ascending: false }),

    admin
      .from('follow')
      .select('id, dog:dog!target_dog_id(id, name, avatar, owner:human!owner_id(username))')
      .eq('follower_id', profileHuman.id)
      .eq('target_type', 'dog')
      .order('created_at', { ascending: false }),

    admin
      .from('follow')
      .select('id, breed:breed!target_breed_id(id, name)')
      .eq('follower_id', profileHuman.id)
      .eq('target_type', 'breed')
      .order('created_at', { ascending: false }),
  ])

  const people = (peopleRes.data ?? [])
    .map((r) => r.human as unknown as FollowedHuman | null)
    .filter((h): h is FollowedHuman => h !== null)

  const dogs: FollowedDog[] = (dogsRes.data ?? [])
    .filter((r) => r.dog != null)
    .map((r) => ({ follow_id: r.id, dog: r.dog as unknown as FollowedDog['dog'] }))

  const breeds: FollowedBreed[] = (breedsRes.data ?? [])
    .filter((r) => r.breed != null)
    .map((r) => ({ follow_id: r.id, breed: r.breed as unknown as FollowedBreed['breed'] }))

  // Check which followed people the current viewer already follows (non-own-profile only)
  const viewerFollowingIds = new Set<string>()
  if (currentUserId && !isOwnProfile && people.length > 0) {
    const { data: myFollows } = await admin
      .from('follow')
      .select('target_human_id')
      .eq('follower_id', currentUserId)
      .eq('target_type', 'human')
      .in('target_human_id', people.map((p) => p.id))
    for (const row of myFollows ?? []) {
      if (row.target_human_id) viewerFollowingIds.add(row.target_human_id as string)
    }
  }

  const isEmpty = people.length === 0 && dogs.length === 0 && breeds.length === 0

  return (
    <div className="min-h-svh bg-white">
      <div className="max-w-[640px] mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#0F2240]/8 sticky top-0 bg-white z-10">
          <Link
            href={`/${username}`}
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#F7F3EE] transition-colors text-[#0F2240]/60 hover:text-[#0F2240]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-[15px] font-bold text-[#0F2240] leading-tight">Following</h1>
            <p className="text-[12px] text-[#0F2240]/45">@{username}</p>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-24">
          {isEmpty ? (
            <p className="text-center text-[14px] text-[#0F2240]/40 py-14">Not following anyone yet.</p>
          ) : (
            <>
              {/* People */}
              {people.length > 0 && (
                <>
                  <SectionHeader title="People" />
                  {people.map((person) => {
                    const isSelf = person.id === currentUserId
                    return (
                      <div key={person.id} className="flex items-center justify-between gap-3 py-3 border-b border-[#0F2240]/6 last:border-0">
                        <Link href={`/${person.username}`} className="flex items-center gap-3 min-w-0">
                          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[#EDE3D6] shrink-0">
                            {person.avatar ? (
                              <Image src={person.avatar} alt={person.display_name ?? ''} fill className="object-cover" />
                            ) : (
                              <div className="flex items-center justify-center h-full text-sm font-bold text-[#0F2240]/40">
                                {(person.display_name ?? person.username ?? '?')[0].toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-[#0F2240] truncate">
                              {person.display_name ?? person.username}
                            </p>
                            {person.username && (
                              <p className="text-[11px] text-[#0F2240]/45">@{person.username}</p>
                            )}
                          </div>
                        </Link>

                        {!isSelf && (
                          isOwnProfile ? (
                            <HumanFollowButton
                              targetId={person.id}
                              targetUsername={person.username ?? ''}
                              initialFollowing={true}
                            />
                          ) : currentUserId ? (
                            <HumanFollowButton
                              targetId={person.id}
                              targetUsername={person.username ?? ''}
                              initialFollowing={viewerFollowingIds.has(person.id)}
                            />
                          ) : null
                        )}
                      </div>
                    )
                  })}
                </>
              )}

              {/* Dogs */}
              {dogs.length > 0 && (
                <>
                  <SectionHeader title="Dogs" />
                  {dogs.map(({ follow_id, dog }) => {
                    const ownerUsername = dog.owner?.username
                    const href = ownerUsername ? `/${ownerUsername}/${slugify(dog.name)}` : '/'
                    return (
                      <div key={follow_id} className="flex items-center justify-between gap-3 py-3 border-b border-[#0F2240]/6 last:border-0">
                        <Link href={href} className="flex items-center gap-3 min-w-0">
                          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[#EDE3D6] shrink-0">
                            {dog.avatar ? (
                              <Image src={dog.avatar} alt={dog.name} fill className="object-cover" />
                            ) : (
                              <div className="flex items-center justify-center h-full text-sm font-bold text-[#0F2240]/40">
                                {dog.name[0].toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-[#0F2240] truncate">{dog.name}</p>
                            {ownerUsername && (
                              <p className="text-[11px] text-[#0F2240]/45">@{ownerUsername}</p>
                            )}
                          </div>
                        </Link>

                        {isOwnProfile && <UnfollowDogButton targetId={dog.id} />}
                      </div>
                    )
                  })}
                </>
              )}

              {/* Breeds */}
              {breeds.length > 0 && (
                <>
                  <SectionHeader title="Breeds" />
                  {breeds.map(({ follow_id, breed }) => (
                    <div key={follow_id} className="flex items-center justify-between gap-3 py-3 border-b border-[#0F2240]/6 last:border-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[#EDE3D6] flex items-center justify-center shrink-0">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F2240" strokeWidth="1.5" opacity="0.4">
                            <path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2 .352-3.5 2.085-3.5 4.066C3 9.05 4.085 10.64 5.5 12 7 13.494 8 15 8 15l4 4 4-4s1-1.506 2.5-3c1.415-1.36 2.5-2.95 2.5-4.934C21 5.085 19.5 3.352 17.5 3c-1.923-.321-3.5.782-3.5 2.172" />
                          </svg>
                        </div>
                        <p className="text-[13px] font-semibold text-[#0F2240] truncate">{breed.name}</p>
                      </div>

                      {isOwnProfile && <UnfollowBreedButton targetId={breed.id} />}
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  )
}
