'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

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

type Results = {
  people: PersonResult[]
  dogs: DogResult[]
  places: PlaceResult[]
  breeds: BreedResult[]
}

const EMPTY: Results = { people: [], dogs: [], places: [], breeds: [] }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFollowers(n: number | null): string {
  if (!n) return '0 followers'
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k followers`
  return `${n} follower${n === 1 ? '' : 's'}`
}

function Avatar({ src, name, size }: { src: string | null; name: string; size: number }) {
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
    <p className="px-4 pt-3 pb-1 text-[11px] font-semibold tracking-widest uppercase text-neutral-400">
      {children}
    </p>
  )
}

function ResultRow({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-neutral-50 transition-colors text-left"
    >
      {children}
    </button>
  )
}

function SkeletonRows() {
  return (
    <div className="py-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-8 animate-pulse bg-neutral-100 rounded mx-4 my-1" />
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SearchDropdown() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Results>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasResults =
    results.people.length > 0 ||
    results.dogs.length > 0 ||
    results.places.length > 0 ||
    results.breeds.length > 0

  const runSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(EMPTY)
      setLoading(false)
      setOpen(false)
      return
    }
    setLoading(true)
    setOpen(true)
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

    setResults({
      people: (peopleRes.data ?? []) as PersonResult[],
      dogs: (dogsRes.data ?? []) as unknown as DogResult[],
      places: (placesRes.data ?? []) as PlaceResult[],
      breeds: (breedsRes.data ?? []) as BreedResult[],
    })
    setLoading(false)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!val.trim()) {
      setResults(EMPTY)
      setOpen(false)
      setLoading(false)
      return
    }
    debounceRef.current = setTimeout(() => runSearch(val.trim()), 300)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      runSearch(query.trim())
    }
    if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const navigate = (href: string) => {
    setOpen(false)
    setQuery('')
    setResults(EMPTY)
    router.push(href)
  }

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const showPanel = open && query.length >= 2

  return (
    <div className="px-4 pt-3 pb-5" ref={containerRef}>
      <div className="relative">
        {/* Search icon */}
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0F2240]/35 pointer-events-none z-10" />

        {/* Loading spinner */}
        {loading && (
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-[#0F2240]/35 pointer-events-none z-10"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}

        <Input
          type="search"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (query.length >= 2) setOpen(true) }}
          placeholder="Search dogs, people, breeds, places…"
          className="pl-9 pr-8 h-10 rounded-xl border-[#0F2240]/15 bg-[#F7F3EE] placeholder:text-[#0F2240]/35 focus-visible:border-[#0F2240]/30 focus-visible:ring-0"
          autoComplete="off"
        />

        {/* Dropdown panel */}
        {showPanel && (
          <div
            className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-[#0F2240]/10 shadow-lg overflow-y-auto"
            style={{ maxHeight: 480, zIndex: 200 }}
          >
            {loading ? (
              <SkeletonRows />
            ) : !hasResults ? (
              <p className="text-center text-[13px] text-neutral-400 py-6">
                No results for &ldquo;{query}&rdquo;
              </p>
            ) : (
              <div className="pb-2">
                {/* People */}
                {results.people.length > 0 && (
                  <div>
                    <SectionLabel>People</SectionLabel>
                    {results.people.map((p) => (
                      <ResultRow key={p.id} onClick={() => navigate(`/${p.username ?? p.id}`)}>
                        <Avatar src={p.avatar} name={p.display_name ?? p.username ?? '?'} size={28} />
                        <span className="text-[13px] font-medium text-[#0F2240] truncate flex-1 min-w-0">
                          {p.display_name ?? p.username}
                        </span>
                        {p.username && (
                          <span className="text-[12px] text-neutral-400 shrink-0">@{p.username}</span>
                        )}
                      </ResultRow>
                    ))}
                  </div>
                )}

                {/* Dogs */}
                {results.dogs.length > 0 && (
                  <div>
                    <SectionLabel>Dogs</SectionLabel>
                    {results.dogs.map((d) => {
                      const ownerUsername = (d.owner as { username: string | null } | null)?.username
                      return (
                        <ResultRow key={d.id} onClick={() => navigate(`/dogs/${d.id}`)}>
                          <Avatar src={d.avatar} name={d.name} size={28} />
                          <span className="text-[13px] font-medium text-[#0F2240] truncate flex-1 min-w-0">
                            {d.name}
                          </span>
                          {ownerUsername && (
                            <span className="text-[12px] text-neutral-400 shrink-0">
                              with @{ownerUsername}
                            </span>
                          )}
                        </ResultRow>
                      )
                    })}
                  </div>
                )}

                {/* Places */}
                {results.places.length > 0 && (
                  <div>
                    <SectionLabel>Places</SectionLabel>
                    {results.places.map((pl) => (
                      <ResultRow key={pl.id} onClick={() => navigate(`/places/${pl.id}`)}>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#8BA0B5"
                          strokeWidth="2"
                          className="shrink-0"
                        >
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span className="text-[13px] font-medium text-[#0F2240] truncate flex-1 min-w-0">
                          {pl.name}
                        </span>
                        {(pl.city || pl.state) && (
                          <span className="text-[12px] text-neutral-400 shrink-0">
                            {[pl.city, pl.state].filter(Boolean).join(', ')}
                          </span>
                        )}
                      </ResultRow>
                    ))}
                  </div>
                )}

                {/* Breeds */}
                {results.breeds.length > 0 && (
                  <div>
                    <SectionLabel>Breeds</SectionLabel>
                    {results.breeds.map((b) => (
                      <ResultRow key={b.id} onClick={() => navigate(`/breeds/${b.id}`)}>
                        <span className="text-[13px] font-medium text-[#0F2240] flex-1 min-w-0 truncate">
                          {b.name}
                        </span>
                        <span className="text-[12px] text-neutral-400 shrink-0">
                          {formatFollowers(b.follower_count)}
                        </span>
                      </ResultRow>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
