import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type DogBreed = {
  is_primary: boolean
  breed: { name: string } | null
}

type Dog = {
  id: string
  name: string
  avatar: string | null
  dog_breeds: DogBreed[]
}

type Human = {
  id: string
  display_name: string | null
  username: string | null
  avatar: string | null
  bio: string | null
  location: string | null
}

function getPrimaryBreed(dog: Dog): string | null {
  const primary = dog.dog_breeds.find((b) => b.is_primary)
  if (primary?.breed) return primary.breed.name
  const first = dog.dog_breeds[0]
  return first?.breed?.name ?? null
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: human, error: humanError } = await admin
    .from('human')
    .select('id, display_name, username, avatar, bio, location')
    .eq('username', username)
    .maybeSingle()

  if (!human) {
    return (
      <pre style={{ padding: 24, fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap' }}>
        {JSON.stringify({ username, human, error: humanError }, null, 2)}
      </pre>
    )
  }

  const h = human as Human

  const { data: { user } } = await supabase.auth.getUser()
  const isOwnProfile = user?.id === h.id

  const { data: dogs } = await admin
    .from('dog')
    .select(`
      id,
      name,
      avatar,
      dog_breeds(
        is_primary,
        breed:breed(name)
      )
    `)
    .eq('owner_id', h.id)

  const dogList: Dog[] = (dogs ?? []) as Dog[]

  return (
    <div className="min-h-svh bg-white">
      <div className="max-w-[640px] mx-auto">

        {/* Cover photo */}
        <div
          className="relative w-full"
          style={{ height: 180, backgroundColor: '#EDE3D6' }}
        >
        </div>

        {/* Avatar + action row */}
        <div className="relative px-4">
          {/* Avatar */}
          <div
            className="absolute -top-12 left-4 w-24 h-24 rounded-full border-4 border-white overflow-hidden bg-[#F7F3EE]"
            style={{ boxShadow: '0 2px 8px rgba(15,34,64,0.12)' }}
          >
            {h.avatar ? (
              <Image src={h.avatar} alt={h.display_name ?? 'Profile'} fill className="object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full text-3xl font-bold text-[#0F2240]/30">
                {(h.display_name ?? '?')[0].toUpperCase()}
              </div>
            )}
          </div>

          {/* Action button */}
          <div className="flex justify-end pt-3">
            {isOwnProfile ? (
              <Link
                href="/onboarding/profile"
                className="text-sm font-medium px-4 py-1.5 rounded-full border border-[#0F2240]/20 text-[#0F2240] hover:bg-[#F7F3EE] transition-colors"
              >
                Edit profile
              </Link>
            ) : (
              <button
                className="text-sm font-semibold px-5 py-1.5 rounded-full text-white transition-colors"
                style={{ backgroundColor: '#0F2240' }}
              >
                Follow
              </button>
            )}
          </div>

          {/* Identity */}
          <div className="mt-3 pb-4">
            {h.display_name && (
              <h1 className="text-xl font-bold text-[#0F2240] leading-tight">{h.display_name}</h1>
            )}
            {h.username && (
              <p className="text-sm text-[#0F2240]/50 mt-0.5">@{h.username}</p>
            )}
            {h.location && (
              <div className="flex items-center gap-1.5 mt-2 text-sm text-[#0F2240]/60">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 10c0 6-8 13-8 13s-8-7-8-13a8 8 0 0 1 16 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {h.location}
              </div>
            )}
            {h.bio && (
              <p className="mt-3 text-sm text-[#0F2240]/80 leading-relaxed">{h.bio}</p>
            )}
          </div>
        </div>

        <div className="border-t border-[#0F2240]/8" />

        {/* Dogs section */}
        <div className="px-4 py-5">
          <h2 className="text-base font-bold text-[#0F2240] mb-4">Dogs</h2>
          {dogList.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
              {dogList.map((dog) => {
                const breed = getPrimaryBreed(dog)
                return (
                  <Link
                    key={dog.id}
                    href={`/dogs/${dog.id}`}
                    className="flex-none flex flex-col items-center gap-2 group"
                  >
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-[#F7F3EE] border-2 border-[#EDE3D6] group-hover:border-[#0F2240] transition-colors">
                      {dog.avatar ? (
                        <Image
                          src={dog.avatar}
                          alt={dog.name}
                          width={80}
                          height={80}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-2xl font-bold text-[#0F2240]/20">
                          {dog.name[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-[#0F2240] leading-tight">{dog.name}</p>
                      {breed && (
                        <p className="text-[10px] text-[#0F2240]/50 mt-0.5 max-w-[72px] truncate">{breed}</p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-[#0F2240]/40">No dogs yet.</p>
          )}
        </div>

        <div className="border-t border-[#0F2240]/8" />

        {/* Kits section */}
        <div className="px-4 py-5">
          <h2 className="text-base font-bold text-[#0F2240] mb-4">Kits</h2>
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#EDE3D6' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F2240" strokeWidth="1.5" opacity="0.5">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              </svg>
            </div>
            <p className="text-sm text-[#0F2240]/50">No kits yet.</p>
          </div>
        </div>

      </div>
    </div>
  )
}
