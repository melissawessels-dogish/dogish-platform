'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import { followHuman } from '@/app/actions/follow'

type HumanResult = {
  id: string
  username: string | null
  display_name: string | null
  avatar: string | null
}

type DogResult = {
  id: string
  name: string
  avatar: string | null
  owner_username: string | null
}

type BreedResult = {
  id: string
  name: string
  cover_image: string | null
  follower_count: number | null
}

type Results = {
  people: HumanResult[]
  dogs: DogResult[]
  breeds: BreedResult[]
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-')
}

function Avatar({
  src,
  alt,
  fallback,
  size = 40,
}: {
  src: string | null
  alt: string
  fallback: string
  size?: number
}) {
  return (
    <div
      className="relative rounded-full overflow-hidden bg-[#EDE3D6] shrink-0 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image src={src} alt={alt} fill className="object-cover" />
      ) : (
        <span className="text-[15px] font-bold text-[#0F2240]/40">
          {fallback[0]?.toUpperCase() ?? '?'}
        </span>
      )}
    </div>
  )
}

function SuggestedPerson({
  person,
  onFollowed,
}: {
  person: HumanResult
  onFollowed: (id: string) => void
}) {
  const [isPending, startTransition] = useTransition()

  const handleFollow = () => {
    onFollowed(person.id) // optimistic remove
    startTransition(async () => {
      await followHuman(person.id, person.username ?? '')
    })
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <Link
        href={person.username ? `/${person.username}` : '/'}
        className="shrink-0"
      >
        <Avatar
          src={person.avatar}
          alt={person.display_name ?? person.username ?? ''}
          fallback={person.display_name ?? person.username ?? '?'}
        />
      </Link>
      <Link
        href={person.username ? `/${person.username}` : '/'}
        className="min-w-0 flex-1"
      >
        <p className="text-[14px] font-semibold text-[#0F2240] leading-tight truncate">
          {person.display_name ?? person.username}
        </p>
        {person.username && (
          <p className="text-[12px] text-[#0F2240]/45 leading-tight">
            @{person.username}
          </p>
        )}
      </Link>
      <button
        type="button"
        onClick={handleFollow}
        disabled={isPending}
        className="shrink-0 text-[12px] font-semibold px-3 py-1 rounded-full text-white disabled:opacity-50 transition-opacity"
        style={{ backgroundColor: '#0F2240' }}
      >
        Follow
      </button>
    </div>
  )
}

export default function SearchPage() {
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Results | null>(null)
  const [loading, setLoading] = useState(false)
  const [myUsername, setMyUsername] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<HumanResult[]>([])
  const [recentPosts, setRecentPosts] = useState<{ id: string; images: string[] }[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load current user + suggestions on mount
  useEffect(() => {
    async function loadContext() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get own username
      const { data: me } = await supabase
        .from('human')
        .select('username')
        .eq('id', user.id)
        .maybeSingle()
      setMyUsername(me?.username ?? null)

      // Get IDs already followed
      const { data: following } = await supabase
        .from('follow')
        .select('target_human_id')
        .eq('follower_id', user.id)
        .eq('target_type', 'human')
        .not('target_human_id', 'is', null)

      const followedIds = (following ?? []).map((r) => r.target_human_id as string)
      const excludeIds = [user.id, ...followedIds]

      // Fetch suggested people (most followed, not already following, not self)
      const { data: suggested } = await supabase
        .from('human')
        .select('id, username, display_name, avatar')
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .order('follower_count', { ascending: false })
        .limit(6)

      setSuggestions((suggested ?? []) as HumanResult[])

      // Fetch recent public posts with images
      const { data: recent } = await supabase
        .from('post')
        .select('id, images')
        .eq('is_private', false)
        .not('images', 'is', null)
        .order('created_at', { ascending: false })
        .limit(12)

      setRecentPosts(
        ((recent ?? []) as { id: string; images: string[] | null }[])
          .filter((p) => p.images && p.images.length > 0)
          .map((p) => ({ id: p.id, images: p.images! }))
      )
    }
    loadContext()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Search with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = query.trim()
    if (!trimmed) {
      setResults(null)
      setLoading(false)
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      const pattern = `%${trimmed}%`

      const [peopleRes, dogsRes, breedsRes] = await Promise.all([
        supabase
          .from('human')
          .select('id, username, display_name, avatar')
          .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
          .limit(5),

        supabase
          .from('dog')
          .select('id, name, avatar, owner:human!owner_id ( username )')
          .ilike('name', pattern)
          .limit(5),

        supabase
          .from('breed')
          .select('id, name, cover_image, follower_count')
          .ilike('name', pattern)
          .limit(5),
      ])

      const dogs: DogResult[] = ((dogsRes.data ?? []) as unknown as {
        id: string
        name: string
        avatar: string | null
        owner: { username: string | null } | null
      }[]).map((d) => ({
        id: d.id,
        name: d.name,
        avatar: d.avatar,
        owner_username: d.owner?.username ?? null,
      }))

      setResults({
        people: (peopleRes.data ?? []) as HumanResult[],
        dogs,
        breeds: (breedsRes.data ?? []) as BreedResult[],
      })
      setLoading(false)
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasResults =
    results &&
    (results.people.length > 0 || results.dogs.length > 0 || results.breeds.length > 0)

  return (
    <div className="min-h-svh bg-white pb-16">
      <div className="max-w-[380px] mx-auto">

        {/* Wordmark */}
        <div className="flex justify-center pt-4 pb-2 px-3 border-b border-[#F0F0F0]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/dogish-wordmark.svg" alt="Dogish" style={{ height: 26 }} />
        </div>

        {/* Search input */}
        <div className="px-3 pt-3 pb-3 border-b border-[#F0F0F0]">
          <div className="relative flex items-center">
            <Search
              size={16}
              className="absolute left-3 text-[#0F2240]/35 pointer-events-none"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dogs, people, breeds…"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#F7F3EE] text-[13px] text-[#0F2240] placeholder:text-[#0F2240]/35 outline-none"
            />
          </div>
        </div>

        {/* Empty state — suggested people */}
        {!query.trim() && suggestions.length > 0 && (
          <section>
            <p className="text-[11px] font-semibold text-[#0F2240]/40 uppercase tracking-wide px-4 pt-4 pb-1.5">
              Find your pack
            </p>
            {suggestions.map((person) => (
              <SuggestedPerson
                key={person.id}
                person={person}
                onFollowed={(id) =>
                  setSuggestions((prev) => prev.filter((p) => p.id !== id))
                }
              />
            ))}
          </section>
        )}

        {/* Recent posts grid */}
        {!query.trim() && recentPosts.length > 0 && (
          <section className="mt-2">
            <p className="text-[11px] font-semibold text-[#0F2240]/40 uppercase tracking-wide px-4 pt-3 pb-1.5">
              Recent posts
            </p>
            <div className="grid grid-cols-3 gap-px">
              {recentPosts.map((post) => (
                <Link key={post.id} href={`/posts/${post.id}`} className="block">
                  <div className="relative w-full aspect-[4/5] overflow-hidden bg-[#F7F3EE]">
                    <Image
                      src={post.images[0]}
                      alt=""
                      fill
                      className="object-cover hover:opacity-90 transition-opacity"
                    />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Search results */}
        {query.trim() && (
          <div className="py-2">
            {loading && (
              <p className="text-[13px] text-[#0F2240]/40 px-4 py-4">Searching…</p>
            )}

            {!loading && results && !hasResults && (
              <p className="text-[13px] text-[#0F2240]/40 px-4 py-4">
                No results for &ldquo;{query.trim()}&rdquo;
              </p>
            )}

            {!loading && hasResults && (
              <>
                {/* People */}
                {results.people.length > 0 && (
                  <section className="mb-2">
                    <p className="text-[11px] font-semibold text-[#0F2240]/40 uppercase tracking-wide px-4 py-1.5">
                      People
                    </p>
                    {results.people.map((person) => (
                      <Link
                        key={person.id}
                        href={person.username ? `/${person.username}` : '/'}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#F7F3EE] transition-colors"
                      >
                        <Avatar
                          src={person.avatar}
                          alt={person.display_name ?? person.username ?? ''}
                          fallback={person.display_name ?? person.username ?? '?'}
                        />
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold text-[#0F2240] leading-tight truncate">
                            {person.display_name ?? person.username}
                          </p>
                          {person.username && (
                            <p className="text-[12px] text-[#0F2240]/45 leading-tight">
                              @{person.username}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </section>
                )}

                {/* Dogs */}
                {results.dogs.length > 0 && (
                  <section className="mb-2">
                    <p className="text-[11px] font-semibold text-[#0F2240]/40 uppercase tracking-wide px-4 py-1.5">
                      Dogs
                    </p>
                    {results.dogs.map((dog) => (
                      <Link
                        key={dog.id}
                        href={
                          dog.owner_username
                            ? `/${dog.owner_username}/${toSlug(dog.name)}`
                            : '/'
                        }
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#F7F3EE] transition-colors"
                      >
                        <Avatar
                          src={dog.avatar}
                          alt={dog.name}
                          fallback={dog.name}
                        />
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold text-[#0F2240] leading-tight truncate">
                            {dog.name}
                          </p>
                          {dog.owner_username && (
                            <p className="text-[12px] text-[#0F2240]/45 leading-tight">
                              @{dog.owner_username}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </section>
                )}

                {/* Breeds */}
                {results.breeds.length > 0 && (
                  <section className="mb-2">
                    <p className="text-[11px] font-semibold text-[#0F2240]/40 uppercase tracking-wide px-4 py-1.5">
                      Breeds
                    </p>
                    {results.breeds.map((breed) => (
                      <Link
                        key={breed.id}
                        href={`/breeds/${toSlug(breed.name)}`}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#F7F3EE] transition-colors"
                      >
                        <Avatar
                          src={breed.cover_image ?? null}
                          alt={breed.name}
                          fallback={breed.name}
                        />
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold text-[#0F2240] leading-tight truncate">
                            {breed.name}
                          </p>
                          <p className="text-[12px] text-[#0F2240]/45 leading-tight">
                            {breed.follower_count ?? 0} followers
                          </p>
                        </div>
                      </Link>
                    ))}
                  </section>
                )}
              </>
            )}
          </div>
        )}

      </div>

      <BottomNav username={myUsername} />
    </div>
  )
}
