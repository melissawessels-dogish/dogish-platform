'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Place = {
  id: string
  name: string
  category: string | null
  address: string | null
  city: string | null
  state: string | null
  lat: number | null
  lng: number | null
  cover_image: string | null
}

type PlaceWithDistance = Place & {
  distanceMi: number | null
  distanceLabel: string
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

function formatDistance(mi: number): string {
  if (mi < 0.1) return '< 0.1 mi'
  return `${mi.toFixed(1)} mi`
}

function capitalizeCategory(cat: string | null): string {
  if (!cat) return ''
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function SkeletonCard() {
  return (
    <div className="w-48 shrink-0 rounded-xl border border-[#0F2240]/8 overflow-hidden animate-pulse">
      <div className="aspect-video bg-neutral-100" />
      <div className="p-3 space-y-2">
        <div className="h-3 w-12 bg-neutral-100 rounded-full" />
        <div className="h-3.5 w-32 bg-neutral-100 rounded" />
        <div className="h-3 w-20 bg-neutral-100 rounded" />
      </div>
    </div>
  )
}

function PlaceCard({ place }: { place: PlaceWithDistance }) {
  return (
    <div className="w-48 shrink-0 rounded-xl border border-[#0F2240]/8 bg-white overflow-hidden">
      {/* Cover image / placeholder */}
      <div className="relative aspect-video rounded-t-xl overflow-hidden bg-[#8BA0B5]">
        {place.cover_image ? (
          <Image
            src={place.cover_image}
            alt={place.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '10px 12px' }}>
        {place.category && (
          <span className="inline-block text-[10px] font-semibold uppercase tracking-wide bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full mb-1.5">
            {capitalizeCategory(place.category)}
          </span>
        )}
        <p className="text-[13px] font-medium text-[#0F2240] leading-snug line-clamp-2">
          {place.name}
        </p>
        <div className="flex items-center gap-1 mt-1.5">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#0F2240]/35 shrink-0">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="text-[11px] text-[#0F2240]/40">{place.distanceLabel}</span>
        </div>
      </div>
    </div>
  )
}

type EmptyReason = 'no-location' | 'no-matches' | null

export default function NeighborhoodPlaces() {
  const [places, setPlaces] = useState<PlaceWithDistance[]>([])
  const [loading, setLoading] = useState(true)
  const [emptyReason, setEmptyReason] = useState<EmptyReason>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const supabase = createClient()

      // Fetch all places
      const { data: allPlaces } = await supabase
        .from('place')
        .select('id, name, category, address, city, state, lat, lng, cover_image')
      const rows = (allPlaces ?? []) as Place[]

      if (rows.length === 0) {
        if (!cancelled) setLoading(false)
        return
      }

      // Try geolocation first
      const tryGeo = (): Promise<GeolocationCoordinates | null> =>
        new Promise((resolve) => {
          if (!navigator.geolocation) { resolve(null); return }
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos.coords),
            () => resolve(null),
            { timeout: 6000 }
          )
        })

      const coords = await tryGeo()

      if (coords) {
        // Score by haversine distance — only rows that have lat/lng
        const withCoords = rows.filter((p) => p.lat != null && p.lng != null)
        if (withCoords.length > 0) {
          const scored = withCoords
            .map((p) => {
              const d = haversineDistance(coords.latitude, coords.longitude, p.lat!, p.lng!)
              return { ...p, distanceMi: d, distanceLabel: formatDistance(d) }
            })
            .sort((a, b) => a.distanceMi! - b.distanceMi!)
            .slice(0, 6)
          if (!cancelled) { setPlaces(scored); setLoading(false) }
          return
        }
      }

      // Fallback: match user's location text against place.city
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id
      let userCity: string | null = null
      if (uid) {
        const { data: humanRow } = await supabase
          .from('human')
          .select('location')
          .eq('id', uid)
          .maybeSingle()
        userCity = humanRow?.location ?? null
      }

      if (userCity && userCity.trim()) {
        const cityLower = userCity.toLowerCase()
        const matched = rows
          .filter((p) => p.city && cityLower.includes(p.city.toLowerCase()))
          .slice(0, 6)
          .map((p) => ({
            ...p,
            distanceMi: null,
            distanceLabel: [p.city, p.state].filter(Boolean).join(', '),
          }))
        if (!cancelled) {
          setPlaces(matched)
          if (matched.length === 0) setEmptyReason('no-matches')
          setLoading(false)
        }
        return
      }

      // No location at all
      if (!cancelled) { setEmptyReason('no-location'); setLoading(false) }
    }

    load()
    return () => { cancelled = true }
  }, [])

  // Has location but no matches — omit section entirely
  if (!loading && emptyReason === 'no-matches') return null

  return (
    <section className="mb-7">
      <h2 className="px-4 mb-3 text-[11px] font-semibold tracking-widest uppercase text-[#0F2240]/40">
        Near you
      </h2>

      {!loading && emptyReason === 'no-location' ? (
        <div className="px-4">
          <div className="max-w-sm rounded-xl border border-dashed border-neutral-300 bg-transparent p-5 flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8BA0B5" strokeWidth="1.8" className="shrink-0">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <div>
              <p className="text-[13px] text-neutral-600 leading-snug">
                Add your location to find dog-friendly places near you
              </p>
              <Link
                href="/onboarding/profile"
                className="text-[13px] font-medium text-[#0F2240]"
              >
                Update profile
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="flex flex-nowrap gap-3 overflow-x-auto px-4 pb-2 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none' }}
        >
          {loading
            ? [0, 1, 2].map((i) => <SkeletonCard key={i} />)
            : places.map((place) => <PlaceCard key={place.id} place={place} />)
          }
        </div>
      )}
    </section>
  )
}
