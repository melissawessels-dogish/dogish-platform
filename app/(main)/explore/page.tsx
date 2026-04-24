import Link from 'next/link'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import SuggestedPeopleSection, { type SuggestedPerson } from './SuggestedPeopleSection'
import SuggestedDogsSection, { type SuggestedDog } from './SuggestedDogsSection'
import PopularPostsSection from './PopularPostsSection'

type PopularBreed = {
  id: string
  name: string
  follower_count: number | null
}

type RawDog = {
  id: string
  name: string
  avatar: string | null
  follower_count: number | null
  dog_breeds: { is_primary: boolean; breed_id: string | null; breed: { name: string } | null }[] | null
  owner: { username: string | null; location: string | null } | null
  owner_id: string
}

function formatCount(n: number | null): string {
  if (!n) return '0 followers'
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k followers`
  return `${n} follower${n === 1 ? '' : 's'}`
}

function locationMatches(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  return a.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(a.toLowerCase())
}

export default async function ExplorePage() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Use user client for follow state (RLS-protected), admin for public catalog queries
  let followedHumanIds: string[] = []
  let followedDogIds: string[] = []

  if (user) {
    const [hRes, dRes] = await Promise.all([
      supabase.from('follow').select('target_human_id')
        .eq('follower_id', user.id).eq('target_type', 'human').not('target_human_id', 'is', null),
      supabase.from('follow').select('target_dog_id')
        .eq('follower_id', user.id).eq('target_type', 'dog').not('target_dog_id', 'is', null),
    ])
    followedHumanIds = (hRes.data ?? []).map((r) => r.target_human_id as string)
    followedDogIds = (dRes.data ?? []).map((r) => r.target_dog_id as string)
  }

  // Gather personalization signals
  let userLocation: string | null = null
  let networkHumanIds: string[] = []

  if (user) {
    // Fetch current user's location
    const { data: humanRow } = await admin
      .from('human')
      .select('location')
      .eq('id', user.id)
      .maybeSingle()
    userLocation = humanRow?.location ?? null

    // Friends-of-friends: humans followed by people the current user follows
    if (followedHumanIds.length > 0) {
      const { data: fofRows } = await admin
        .from('follow')
        .select('target_human_id')
        .in('follower_id', followedHumanIds)
        .eq('target_type', 'human')
        .not('target_human_id', 'is', null)
      const excludeFromNetwork = new Set([user.id, ...followedHumanIds])
      networkHumanIds = [...new Set(
        (fofRows ?? [])
          .map((r) => r.target_human_id as string)
          .filter((id) => !excludeFromNetwork.has(id))
      )]
    }
  }

  // Suggested people — fetch 50 candidates, score in JS, take top 10
  const excludeHumanIds = user ? [user.id, ...followedHumanIds] : followedHumanIds
  const peopleQueryBase = admin
    .from('human')
    .select('id, display_name, username, avatar, follower_count, location')
    .order('follower_count', { ascending: false })
    .limit(50)
  let peopleQuery = peopleQueryBase
  for (const id of excludeHumanIds) {
    peopleQuery = peopleQuery.neq('id', id)
  }
  const { data: peopleRaw, error: peopleError } = await peopleQuery
  console.log('[explore] people candidates:', peopleRaw?.length ?? 0, peopleError?.message ?? 'ok')

  const networkSet = new Set(networkHumanIds)
  const scoredPeople = ((peopleRaw ?? []) as (SuggestedPerson & { location?: string | null })[])
    .map((p) => {
      let score = 0
      if (networkSet.has(p.id)) score += 3
      if (locationMatches(p.location, userLocation)) score += 2
      score += Math.min((p.follower_count ?? 0) / 10, 3)
      return { ...p, score }
    })
    .sort((a, b) => b.score - a.score)

  console.log('[explore] top 3 people:', scoredPeople.slice(0, 3).map((p) => ({ username: p.username, score: p.score.toFixed(2) })))
  const people = scoredPeople.slice(0, 10) as SuggestedPerson[]

  // Suggested dogs — fetch 50 candidates, score in JS, take top 10
  const dogsQueryBase = admin
    .from('dog')
    .select('id, name, avatar, follower_count, owner_id, dog_breeds(is_primary, breed_id, breed:breed(name)), owner:human!owner_id(username, location)')
    .eq('is_private', false)
    .order('follower_count', { ascending: false })
    .limit(50)
  const dogsQueryFiltered = user
    ? dogsQueryBase.neq('owner_id', user.id)
    : dogsQueryBase
  const { data: dogsRaw, error: dogsError } = await (
    followedDogIds.length > 0
      ? dogsQueryFiltered.not('id', 'in', `(${followedDogIds.join(',')})`)
      : dogsQueryFiltered
  )
  console.log('[explore] dog candidates:', dogsRaw?.length ?? 0, dogsError?.message ?? 'ok')

  // Collect breed IDs from the current user's dogs (needed for both dog scoring and breed section)
  let userBreedIds: string[] = []
  if (user) {
    const { data: userDogs } = await admin
      .from('dog')
      .select('id')
      .eq('owner_id', user.id)
    const userDogIds = (userDogs ?? []).map((d) => d.id as string)
    if (userDogIds.length > 0) {
      const { data: userDogBreeds } = await admin
        .from('dog_breeds')
        .select('breed_id')
        .in('dog_id', userDogIds)
      userBreedIds = [...new Set((userDogBreeds ?? []).map((r) => r.breed_id as string))]
    }
  }

  const userBreedSet = new Set(userBreedIds)
  const scoredDogs = ((dogsRaw ?? []) as unknown as RawDog[])
    .map((d) => {
      const ownerObj = d.owner as { username: string | null; location: string | null } | null
      const dogBreedIds = (d.dog_breeds ?? []).map((b) => b.breed_id).filter(Boolean) as string[]
      let score = 0
      if (dogBreedIds.some((id) => userBreedSet.has(id))) score += 3
      if (locationMatches(ownerObj?.location, userLocation)) score += 2
      if (networkSet.has(d.owner_id)) score += 1
      score += Math.min((d.follower_count ?? 0) * 0.1, 2)
      return {
        id: d.id,
        name: d.name,
        avatar: d.avatar,
        follower_count: d.follower_count,
        primary_breed:
          d.dog_breeds?.find((b) => b.is_primary)?.breed?.name ??
          d.dog_breeds?.[0]?.breed?.name ??
          null,
        owner_username: ownerObj?.username ?? null,
        score,
      }
    })
    .sort((a, b) => b.score - a.score)

  console.log('[explore] top 3 dogs:', scoredDogs.slice(0, 3).map((d) => ({ name: d.name, score: d.score.toFixed(2) })))
  const dogs: SuggestedDog[] = scoredDogs.slice(0, 10)

  // Popular posts — last 30 days, recency-weighted score
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: postsRaw } = await admin
    .from('post')
    .select('id, images, like_count, comment_count, save_count, created_at')
    .eq('is_private', false)
    .not('images', 'is', null)
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false })
    .limit(50)
  const scoredPosts = ((postsRaw ?? []) as { id: string; images: string[]; like_count: number | null; comment_count: number | null; save_count: number | null; created_at: string }[])
    .map((post) => {
      const hoursAgo = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60)
      const engagementScore = (
        (post.like_count ?? 0) * 1.0 +
        (post.comment_count ?? 0) * 2.0 +
        (post.save_count ?? 0) * 3.0
      )
      const velocity = engagementScore / Math.max(hoursAgo, 1)
      const score = velocity / Math.pow(Math.max(hoursAgo, 1), 0.5)
      return { ...post, score }
    })
    .sort((a, b) => b.score - a.score)
  const popularPosts = scoredPosts.slice(0, 12)

  // Fetch the user's own breed rows (guaranteed top slots)
  let userBreeds: PopularBreed[] = []
  if (userBreedIds.length > 0) {
    const { data: userBreedsRaw } = await admin
      .from('breed')
      .select('id, name, follower_count')
      .in('id', userBreedIds)
    userBreeds = (userBreedsRaw ?? []) as PopularBreed[]
  }

  // Fetch popular breeds excluding user's breeds, fill up to 12 total
  const popularLimit = 12 - userBreeds.length
  const popularBreedsQueryBase = admin
    .from('breed')
    .select('id, name, follower_count')
    .order('follower_count', { ascending: false })
    .limit(popularLimit)
  const { data: popularBreedsRaw } = await (
    userBreedIds.length > 0
      ? popularBreedsQueryBase.not('id', 'in', `(${userBreedIds.join(',')})`)
      : popularBreedsQueryBase
  )
  const popularBreeds = (popularBreedsRaw ?? []) as PopularBreed[]

  const breeds = [...userBreeds, ...popularBreeds]

  return (
    <div className="max-w-lg mx-auto pb-8">

      {/* Page title */}
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-3xl font-bold text-[#0F2240]">Find your pack</h1>
      </div>

      {/* Search bar */}
      <div className="px-4 pt-3 pb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0F2240]/35 pointer-events-none" />
          <Input
            type="search"
            placeholder="Search dogs, people, breeds, places…"
            className="pl-9 h-10 rounded-xl border-[#0F2240]/15 bg-[#F7F3EE] placeholder:text-[#0F2240]/35 focus-visible:border-[#0F2240]/30 focus-visible:ring-0"
            readOnly
          />
        </div>
      </div>

      {/* Popular posts */}
      <PopularPostsSection posts={popularPosts} />

      {/* Suggested people */}
      {people.length > 0 && (
        <section className="mb-7">
          <h2 className="px-4 mb-3 text-[11px] font-semibold tracking-widest uppercase text-[#0F2240]/40">
            People
          </h2>
          <SuggestedPeopleSection people={people} userId={user?.id ?? null} />
        </section>
      )}

      {/* Suggested dogs */}
      {dogs.length > 0 && (
        <section className="mb-7">
          <h2 className="px-4 mb-3 text-[11px] font-semibold tracking-widest uppercase text-[#0F2240]/40">
            Dogs
          </h2>
          <SuggestedDogsSection dogs={dogs} userId={user?.id ?? null} />
        </section>
      )}

      {/* Popular breeds */}
      {breeds.length > 0 && (
        <section className="px-4 mb-7">
          <h2 className="mb-3 text-[11px] font-semibold tracking-widest uppercase text-[#0F2240]/40">
            Popular breeds
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {breeds.map((breed) => (
              <Link
                key={breed.id}
                href={`/breeds/${breed.id}`}
                className="flex items-center justify-between px-3.5 py-3 rounded-xl border border-[#0F2240]/10 hover:border-[#0F2240]/25 hover:bg-[#F7F3EE] transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#0F2240] leading-tight">{breed.name}</p>
                  <p className="text-[11px] text-[#0F2240]/40 mt-0.5">{formatCount(breed.follower_count)}</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#0F2240]/25 shrink-0 ml-2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            ))}
          </div>
        </section>
      )}

    </div>
  )
}
