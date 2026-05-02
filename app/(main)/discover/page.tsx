'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SuggestedPeopleSection, { type SuggestedPerson } from './SuggestedPeopleSection'
import SuggestedDogsSection, { type SuggestedDog } from './SuggestedDogsSection'
import PopularPostsSection from './PopularPostsSection'
import NeighborhoodPlaces from '@/components/explore/NeighborhoodPlaces'

// ── Types ───────────────────────────────────────────────────────────────────

type PersonResult = {
  id: string
  username: string | null
  display_name: string | null
  avatar: string | null
  follower_count: number | null
}

type DogResult = {
  id: string
  name: string
  avatar: string | null
  follower_count: number | null
  owner: { username: string | null } | null
}

type PlaceResult = {
  id: string
  name: string
  category: string | null
  city: string | null
  state: string | null
}

type BreedResult = {
  id: string
  name: string
  follower_count: number | null
}

type SearchResults = {
  people: PersonResult[]
  dogs: DogResult[]
  places: PlaceResult[]
  breeds: BreedResult[]
}

type PopularPost = {
  id: string
  images: string[]
  like_count: number | null
}

type PopularBreed = {
  id: string
  name: string
  follower_count: number | null
}

type DiscoveryData = {
  people: SuggestedPerson[]
  dogs: SuggestedDog[]
  popularPosts: PopularPost[]
  breeds: PopularBreed[]
}

const EMPTY_SEARCH: SearchResults = { people: [], dogs: [], places: [], breeds: [] }
const EMPTY_DISCOVERY: DiscoveryData = { people: [], dogs: [], popularPosts: [], breeds: [] }

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatFollowers(n: number | null): string {
  if (!n) return '0 followers'
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k followers`
  return `${n} follower${n === 1 ? '' : 's'}`
}

function AvatarCircle({ src, name, size }: { src: string | null; name: string; size: number }) {
  return (
    <div
      className="relative rounded-full overflow-hidden bg-[#EDE3D6] shrink-0 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image src={src} alt={name} fill className="object-cover" />
      ) : (
        <span className="text-[10px] font-bold text-[#0F2240]/50 leading-none">
          {name[0]?.toUpperCase() ?? '?'}
        </span>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="px-4 pt-4 pb-1.5 text-[11px] font-semibold tracking-widest uppercase text-[#0F2240]/40">
      {children}
    </p>
  )
}

function ResultRow({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#F7F3EE] transition-colors"
    >
      {children}
    </Link>
  )
}

function SearchSkeleton() {
  return (
    <div className="py-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-2.5">
          <div className="w-7 h-7 rounded-full bg-[#EDE3D6] animate-pulse shrink-0" />
          <div className="flex-1 h-3 bg-[#EDE3D6] rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}

function DiscoverySkeleton() {
  return (
    <div className="pt-2 pb-8 animate-pulse">
      {[0, 1, 2].map((i) => (
        <div key={i} className="mb-8">
          <div className="h-3 w-28 bg-[#EDE3D6] rounded mx-4 mb-4" />
          <div className="flex gap-3 px-4 overflow-hidden">
            {[0, 1, 2].map((j) => (
              <div key={j} className="w-36 h-48 rounded-2xl bg-[#EDE3D6] shrink-0" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function ExplorePage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResults>(EMPTY_SEARCH)
  const [searching, setSearching] = useState(false)
  const [discovery, setDiscovery] = useState<DiscoveryData>(EMPTY_DISCOVERY)
  const [discoveryLoaded, setDiscoveryLoaded] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load current user + discovery data on mount
  useEffect(() => {
    async function loadDiscovery() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id ?? null)

      const [hFollowRes, dFollowRes] = user ? await Promise.all([
        supabase.from('follow').select('target_human_id').eq('follower_id', user.id).eq('target_type', 'human').not('target_human_id', 'is', null),
        supabase.from('follow').select('target_dog_id').eq('follower_id', user.id).eq('target_type', 'dog').not('target_dog_id', 'is', null),
      ]) : [{ data: [] }, { data: [] }]

      const followedHumanIds = ((hFollowRes.data ?? []) as { target_human_id: string }[]).map((r) => r.target_human_id)
      const followedDogIds = ((dFollowRes.data ?? []) as { target_dog_id: string }[]).map((r) => r.target_dog_id)
      const excludeHumans = user ? [user.id, ...followedHumanIds] : followedHumanIds

      // Fetch people candidates
      let peopleQuery = supabase
        .from('human')
        .select('id, display_name, username, avatar, follower_count')
        .order('follower_count', { ascending: false })
        .limit(20)
      for (const id of excludeHumans) {
        peopleQuery = peopleQuery.neq('id', id)
      }

      // Fetch dog candidates
      let dogsQuery = supabase
        .from('dog')
        .select('id, name, avatar, follower_count, owner_id, dog_breeds(is_primary, breed_id, breed:breed(name)), owner:human!owner_id(username)')
        .eq('is_private', false)
        .order('follower_count', { ascending: false })
        .limit(20)
      if (user) dogsQuery = dogsQuery.neq('owner_id', user.id)
      if (followedDogIds.length > 0) {
        dogsQuery = dogsQuery.not('id', 'in', `(${followedDogIds.join(',')})`)
      }

      // Popular posts last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const postsQuery = supabase
        .from('post')
        .select('id, images, like_count, comment_count, created_at')
        .eq('is_private', false)
        .not('images', 'is', null)
        .gte('created_at', sevenDaysAgo)
        .order('like_count', { ascending: false })
        .limit(12)

      // Popular breeds
      const breedsQuery = supabase
        .from('breed')
        .select('id, name, follower_count')
        .order('follower_count', { ascending: false })
        .limit(12)

      const [peopleRes, dogsRes, postsRes, breedsRes] = await Promise.all([
        peopleQuery,
        dogsQuery,
        postsQuery,
        breedsQuery,
      ])

      type RawDog = {
        id: string
        name: string
        avatar: string | null
        follower_count: number | null
        owner_id: string
        dog_breeds: { is_primary: boolean; breed_id: string | null; breed: { name: string } | null }[] | null
        owner: { username: string | null } | null
      }

      const dogs: SuggestedDog[] = ((dogsRes.data ?? []) as unknown as RawDog[]).map((d) => ({
        id: d.id,
        name: d.name,
        avatar: d.avatar,
        follower_count: d.follower_count,
        primary_breed:
          d.dog_breeds?.find((b) => b.is_primary)?.breed?.name ??
          d.dog_breeds?.[0]?.breed?.name ??
          null,
        owner_username: d.owner?.username ?? null,
      }))

      const posts = ((postsRes.data ?? []) as { id: string; images: string[] | null; like_count: number | null }[])
        .filter((p) => p.images?.[0])
        .map((p) => ({ id: p.id, images: p.images as string[], like_count: p.like_count }))

      setDiscovery({
        people: (peopleRes.data ?? []) as SuggestedPerson[],
        dogs,
        popularPosts: posts,
        breeds: (breedsRes.data ?? []) as PopularBreed[],
      })
      setDiscoveryLoaded(true)
    }

    loadDiscovery()
  }, [])

  const runSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSearchResults(EMPTY_SEARCH)
      setSearching(false)
      return
    }
    setSearching(true)
    const supabase = createClient()
    const pattern = `%${q}%`

    const [peopleRes, dogsRes, placesRes, breedsRes] = await Promise.all([
      supabase
        .from('human')
        .select('id, username, display_name, avatar, follower_count')
        .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
        .limit(5),
      supabase
        .from('dog')
        .select('id, name, avatar, follower_count, owner:human!owner_id(username)')
        .ilike('name', pattern)
        .eq('is_private', false)
        .limit(5),
      supabase
        .from('place')
        .select('id, name, category, city, state')
        .or(`name.ilike.${pattern},city.ilike.${pattern}`)
        .limit(5),
      supabase
        .from('breed')
        .select('id, name, follower_count')
        .ilike('name', pattern)
        .limit(5),
    ])

    setSearchResults({
      people: (peopleRes.data ?? []) as PersonResult[],
      dogs: (dogsRes.data ?? []) as unknown as DogResult[],
      places: (placesRes.data ?? []) as PlaceResult[],
      breeds: (breedsRes.data ?? []) as BreedResult[],
    })
    setSearching(false)
  }, [])

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!val.trim()) {
      setSearchResults(EMPTY_SEARCH)
      return
    }
    debounceRef.current = setTimeout(() => runSearch(val.trim()), 300)
  }

  const isSearching = query.trim().length >= 2
  const hasResults =
    searchResults.people.length > 0 ||
    searchResults.dogs.length > 0 ||
    searchResults.places.length > 0 ||
    searchResults.breeds.length > 0

  return (
    <div className="min-h-svh bg-white pb-20">
      <div className="max-w-lg mx-auto">

        {/* Search bar — always visible */}
        <div className="px-4 pt-5 pb-3 sticky top-0 bg-white z-10 border-b border-[#0F2240]/6">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#0F2240]/35"
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>

            {searching && (
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-[#0F2240]/35 pointer-events-none" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}

            {query.length > 0 && !searching && (
              <button
                onClick={() => { setQuery(''); setSearchResults(EMPTY_SEARCH) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0F2240]/35 hover:text-[#0F2240]/60"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}

            <input
              type="search"
              value={query}
              onChange={handleQueryChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && debounceRef.current) {
                  clearTimeout(debounceRef.current)
                  runSearch(query.trim())
                }
              }}
              placeholder="Search dogs, people, breeds, places…"
              className="w-full pl-9 pr-8 h-10 rounded-xl border border-[#0F2240]/12 bg-[#F7F3EE] text-[14px] text-[#0F2240] placeholder:text-[#0F2240]/35 outline-none focus:border-[#0F2240]/25 transition-colors"
              autoComplete="off"
            />
          </div>
        </div>

        {/* ── Search results ── */}
        {isSearching ? (
          searching ? (
            <SearchSkeleton />
          ) : !hasResults ? (
            <p className="text-center text-[13px] text-[#0F2240]/40 py-12">
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            <div className="pb-8">
              {searchResults.people.length > 0 && (
                <div>
                  <SectionLabel>People</SectionLabel>
                  {searchResults.people.map((p) => (
                    <ResultRow key={p.id} href={`/${p.username ?? p.id}`}>
                      <AvatarCircle src={p.avatar} name={p.display_name ?? p.username ?? '?'} size={32} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[#0F2240] truncate">{p.display_name ?? p.username}</p>
                        {p.username && <p className="text-[11px] text-[#0F2240]/45">@{p.username}</p>}
                      </div>
                    </ResultRow>
                  ))}
                </div>
              )}

              {searchResults.dogs.length > 0 && (
                <div>
                  <SectionLabel>Dogs</SectionLabel>
                  {searchResults.dogs.map((d) => {
                    const ownerUsername = (d.owner as { username: string | null } | null)?.username
                    return (
                      <ResultRow key={d.id} href={ownerUsername ? `/${ownerUsername}/${d.name.toLowerCase()}` : `/dogs/${d.id}`}>
                        <AvatarCircle src={d.avatar} name={d.name} size={32} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-[#0F2240] truncate">{d.name}</p>
                          {ownerUsername && <p className="text-[11px] text-[#0F2240]/45">@{ownerUsername}</p>}
                        </div>
                      </ResultRow>
                    )
                  })}
                </div>
              )}

              {searchResults.places.length > 0 && (
                <div>
                  <SectionLabel>Places</SectionLabel>
                  {searchResults.places.map((pl) => (
                    <ResultRow key={pl.id} href={`/places/${pl.id}`}>
                      <div className="w-8 h-8 rounded-full bg-[#EDE3D6] flex items-center justify-center shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0F2240" strokeWidth="2" opacity="0.4">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[#0F2240] truncate">{pl.name}</p>
                        {(pl.city || pl.state) && (
                          <p className="text-[11px] text-[#0F2240]/45">{[pl.city, pl.state].filter(Boolean).join(', ')}</p>
                        )}
                      </div>
                    </ResultRow>
                  ))}
                </div>
              )}

              {searchResults.breeds.length > 0 && (
                <div>
                  <SectionLabel>Breeds</SectionLabel>
                  {searchResults.breeds.map((b) => (
                    <ResultRow key={b.id} href={`/breeds/${b.id}`}>
                      <div className="w-8 h-8 rounded-full bg-[#EDE3D6] flex items-center justify-center shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0F2240" strokeWidth="1.5" opacity="0.4">
                          <path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2 .352-3.5 2.085-3.5 4.066C3 9.05 4.085 10.64 5.5 12 7 13.494 8 15 8 15l4 4 4-4s1-1.506 2.5-3c1.415-1.36 2.5-2.95 2.5-4.934C21 5.085 19.5 3.352 17.5 3c-1.923-.321-3.5.782-3.5 2.172" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[#0F2240] truncate">{b.name}</p>
                        <p className="text-[11px] text-[#0F2240]/45">{formatFollowers(b.follower_count)}</p>
                      </div>
                    </ResultRow>
                  ))}
                </div>
              )}
            </div>
          )
        ) : (
          /* ── Discovery sections ── */
          !discoveryLoaded ? (
            <DiscoverySkeleton />
          ) : (
            <div>
              {/* Near you */}
              <NeighborhoodPlaces />

              {/* Popular this week */}
              {discovery.popularPosts.length > 0 && (
                <PopularPostsSection posts={discovery.popularPosts} />
              )}

              {/* Dogs you might like */}
              {discovery.dogs.length > 0 && (
                <section className="mb-7">
                  <h2 className="px-4 mb-3 text-[11px] font-semibold tracking-widest uppercase text-[#0F2240]/40">
                    Dogs you might like
                  </h2>
                  <SuggestedDogsSection dogs={discovery.dogs} userId={userId} />
                </section>
              )}

              {/* People to follow */}
              {discovery.people.length > 0 && (
                <section className="mb-7">
                  <h2 className="px-4 mb-3 text-[11px] font-semibold tracking-widest uppercase text-[#0F2240]/40">
                    People to follow
                  </h2>
                  <SuggestedPeopleSection people={discovery.people} userId={userId} />
                </section>
              )}

              {/* Browse breeds */}
              {discovery.breeds.length > 0 && (
                <section className="px-4 mb-7">
                  <h2 className="mb-3 text-[11px] font-semibold tracking-widest uppercase text-[#0F2240]/40">
                    Browse breeds
                  </h2>
                  <div className="grid grid-cols-2 gap-2.5">
                    {discovery.breeds.map((breed) => (
                      <Link
                        key={breed.id}
                        href={`/breeds/${breed.id}`}
                        className="flex items-center justify-between px-3.5 py-3 rounded-xl border border-[#0F2240]/10 hover:border-[#0F2240]/25 hover:bg-[#F7F3EE] transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-[#0F2240] leading-tight truncate">{breed.name}</p>
                          <p className="text-[11px] text-[#0F2240]/40 mt-0.5">{formatFollowers(breed.follower_count)}</p>
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
        )}
      </div>
    </div>
  )
}
