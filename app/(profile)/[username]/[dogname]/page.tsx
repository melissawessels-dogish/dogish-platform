import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type DogPage = {
  id: string
  name: string
  avatar: string | null
  bio: string | null
  size: string | null
  sex: string | null
  birthday: string | null
  personality_tags: string[] | null
  allergies: string[] | null
  is_private: boolean
  owner_id: string
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

  // Find dog by owner + name (case-insensitive)
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
      allergies,
      is_private,
      owner_id,
      dog_breeds(
        is_primary,
        breed:breed(name)
      )
    `)
    .eq('owner_id', owner.id)
    .ilike('name', dogname)
    .limit(1)

  const dog = dogRows?.[0] ?? null
  if (!dog) notFound()

  const d = dog as DogPage
  const allBreeds = getAllBreeds(d)

  const { data: { user } } = await supabase.auth.getUser()
  const isOwnDog = user?.id === d.owner_id

  const { data: kits } = await admin
    .from('kit')
    .select('id, name')
    .eq('dog_id', d.id)
    .order('created_at', { ascending: true })

  const kitList = kits ?? []

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

        {/* Avatar + action row */}
        <div className="relative px-4">
          {/* Avatar */}
          <div
            className="absolute -top-12 left-4 w-24 h-24 rounded-full border-4 border-white overflow-hidden bg-[#F7F3EE]"
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
          <div className="flex justify-end pt-3">
            {isOwnDog ? (
              <Link
                href={`/${owner.username}/${d.name.toLowerCase()}/edit`}
                className="text-sm font-medium px-4 py-1.5 rounded-full border border-[#0F2240]/20 text-[#0F2240] hover:bg-[#F7F3EE] transition-colors"
              >
                Edit
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
          <div className="mt-3 pb-1">
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

          {/* Allergy chips */}
          {d.allergies && d.allergies.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2 pb-4">
              {d.allergies.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: '#C4855A' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {!d.bio && (!d.personality_tags || d.personality_tags.length === 0) && (!d.allergies || d.allergies.length === 0) && (
            <div className="pb-4" />
          )}
        </div>

        <div className="border-t border-[#0F2240]/8" />

        {/* Posts section */}
        <div className="px-4 py-5">
          <h2 className="text-base font-bold text-[#0F2240] mb-4">Posts</h2>
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#EDE3D6' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F2240" strokeWidth="1.5" opacity="0.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            </div>
            <p className="text-sm text-[#0F2240]/50">No posts yet.</p>
          </div>
        </div>

        <div className="border-t border-[#0F2240]/8" />

        {/* Kits section */}
        <div className="px-4 py-5">
          <h2 className="text-base font-bold text-[#0F2240] mb-4">Kits</h2>
          {kitList.length > 0 ? (
            <div className="flex flex-col gap-2">
              {kitList.map((kit) => (
                <div
                  key={kit.id}
                  className="px-4 py-3 rounded-xl border border-[#0F2240]/10 bg-[#F7F3EE]"
                >
                  <p className="text-sm font-semibold text-[#0F2240]">{kit.name}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
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
              {isOwnDog && (
                <Link
                  href={`/kits/new?dog=${d.id}`}
                  className="text-sm font-medium px-4 py-1.5 rounded-full text-white"
                  style={{ backgroundColor: '#0F2240' }}
                >
                  Create a kit
                </Link>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
