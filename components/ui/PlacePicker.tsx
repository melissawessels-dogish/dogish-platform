'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const HAS_GOOGLE_KEY = !!process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY

// ─── Types ────────────────────────────────────────────────────────────────────

type PlaceOption = {
  place_id: string       // Google places/XXXXX id (or internal for Supabase-only mode)
  name: string
  formatted_address: string
  city: string | null
  state: string | null
  lat: number | null
  lng: number | null
  website: string | null
}

export interface PlacePickerProps {
  onPlaceSelect: (place: { id: string; name: string; city: string; state: string }) => void
  placeholder?: string
  className?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PlacePicker({
  onPlaceSelect,
  placeholder = 'Search for a place…',
  className,
}: PlacePickerProps) {
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<PlaceOption[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<{ id: string; name: string; city: string; state: string } | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setOptions([]); setOpen(false); setLoading(false); return }
    setLoading(true)
    setOpen(true)

    if (HAS_GOOGLE_KEY) {
      const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(q)}`)
      const data: PlaceOption[] = res.ok ? await res.json() : []
      setOptions(data)
    } else {
      // Supabase-only fallback: search existing place table
      const supabase = createClient()
      const { data } = await supabase
        .from('place')
        .select('id, name, address, city, state, lat, lng, website')
        .or(`name.ilike.%${q}%,city.ilike.%${q}%`)
        .limit(6)
      setOptions(
        (data ?? []).map((p) => ({
          place_id: p.id,
          name: p.name,
          formatted_address: [p.address, p.city, p.state].filter(Boolean).join(', '),
          city: p.city,
          state: p.state,
          lat: p.lat,
          lng: p.lng,
          website: p.website ?? null,
        }))
      )
    }
    setLoading(false)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!val.trim()) { setOptions([]); setOpen(false); setLoading(false); return }
    debounceRef.current = setTimeout(() => search(val.trim()), 300)
  }

  const handleSelect = async (option: PlaceOption) => {
    setOpen(false)
    setLoading(true)

    const supabase = createClient()

    if (HAS_GOOGLE_KEY) {
      // Fetch full details (lat/lng may not be in autocomplete response)
      const detailsRes = await fetch(`/api/places/details?place_id=${encodeURIComponent(option.place_id)}`)
      const details: PlaceOption | null = detailsRes.ok ? await detailsRes.json() : null
      const resolved = details ?? option

      // Check for existing record by google_place_id
      const { data: existing } = await supabase
        .from('place')
        .select('id, name, city, state')
        .eq('google_place_id', option.place_id)
        .maybeSingle()

      if (existing) {
        let city = existing.city ?? ''
        let state = existing.state ?? ''
        if (!existing.city && (resolved.city || resolved.state)) {
          await supabase
            .from('place')
            .update({ city: resolved.city ?? null, state: resolved.state ?? null })
            .eq('id', existing.id)
          city = resolved.city ?? ''
          state = resolved.state ?? ''
        }
        const result = { id: existing.id, name: existing.name, city, state }
        setSelected(result)
        setQuery('')
        onPlaceSelect(result)
        setLoading(false)
        return
      }

      // Insert new place
      const { data: inserted, error } = await supabase
        .from('place')
        .insert({
          name: resolved.name,
          address: resolved.formatted_address ?? null,
          city: resolved.city ?? null,
          state: resolved.state ?? null,
          lat: resolved.lat ?? null,
          lng: resolved.lng ?? null,
          website: resolved.website ?? null,
          google_place_id: option.place_id,
        })
        .select('id, name, city, state')
        .single()

      if (error || !inserted) {
        console.error('[PlacePicker] insert error:', error?.message)
        setLoading(false)
        return
      }

      const result = { id: inserted.id, name: inserted.name, city: inserted.city ?? '', state: inserted.state ?? '' }
      setSelected(result)
      setQuery('')
      onPlaceSelect(result)
    } else {
      // Supabase-only: place_id IS the Dogish UUID
      const result = {
        id: option.place_id,
        name: option.name,
        city: option.city ?? '',
        state: option.state ?? '',
      }
      setSelected(result)
      setQuery('')
      onPlaceSelect(result)
    }

    setLoading(false)
  }

  const handleClear = () => {
    setSelected(null)
    setQuery('')
    setOptions([])
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (selected) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 h-9 px-3 rounded-lg border border-input bg-transparent text-sm',
          className
        )}
      >
        <MapPin size={14} className="shrink-0 text-[#8BA0B5]" />
        <span className="flex-1 truncate font-medium text-[#0F2240]">{selected.name}</span>
        {selected.city && (
          <span className="text-xs text-muted-foreground shrink-0">
            {[selected.city, selected.state].filter(Boolean).join(', ')}
          </span>
        )}
        <button
          type="button"
          onClick={handleClear}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Clear selection"
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <MapPin
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8BA0B5] pointer-events-none"
        />
        {loading && (
          <svg
            className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground pointer-events-none"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => { if (options.length > 0) setOpen(true) }}
          onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(
            'h-9 w-full min-w-0 rounded-lg border border-input bg-transparent pl-8 pr-8 py-1 text-sm transition-colors outline-none',
            'placeholder:text-muted-foreground',
            'focus-visible:border-[#0F2240] focus-visible:ring-2 focus-visible:ring-[#0F2240]/20',
            'disabled:pointer-events-none disabled:opacity-50'
          )}
        />
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white rounded-md border border-input shadow-lg max-h-64 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">Searching…</div>
          ) : options.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">No places found</div>
          ) : (
            options.map((opt) => (
              <button
                key={opt.place_id}
                type="button"
                onClick={() => handleSelect(opt)}
                className="w-full flex flex-col items-start px-3 py-2.5 hover:bg-neutral-50 transition-colors text-left"
              >
                <span className="text-sm font-medium text-[#0F2240] leading-tight">{opt.name}</span>
                <span className="text-xs text-muted-foreground mt-0.5 leading-tight">
                  {opt.formatted_address || [opt.city, opt.state].filter(Boolean).join(', ')}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
