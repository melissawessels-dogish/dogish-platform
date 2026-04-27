import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY

type AddressComponent = {
  longText: string
  shortText: string
  types: string[]
}

type GooglePlace = {
  id: string
  displayName?: { text: string }
  formattedAddress?: string
  location?: { latitude: number; longitude: number }
  websiteUri?: string
  addressComponents?: AddressComponent[]
}

function extractCityState(components: AddressComponent[] | undefined) {
  const county = components?.find((c) => c.types.includes('administrative_area_level_2'))?.longText
  const city =
    components?.find((c) => c.types.includes('locality'))?.longText ??
    components?.find((c) => c.types.includes('sublocality_level_1'))?.longText ??
    components?.find((c) => c.types.includes('sublocality'))?.longText ??
    components?.find((c) => c.types.includes('neighborhood'))?.longText ??
    (county ? county.replace(/ County$/i, '') : null)
  const state = components?.find((c) => c.types.includes('administrative_area_level_1'))?.shortText ?? null
  return { city, state }
}

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get('input')?.trim()
  if (!input || input.length < 2) return NextResponse.json([])
  if (!API_KEY) return NextResponse.json([])

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.location,places.websiteUri,places.addressComponents',
    },
    body: JSON.stringify({ textQuery: input }),
  })

  if (!res.ok) return NextResponse.json([])

  const json = await res.json()
  const places: GooglePlace[] = json.places ?? []

  const results = places.slice(0, 6).map((p) => {
    const { city, state } = extractCityState(p.addressComponents)
    return {
      place_id: `places/${p.id}`,
      name: p.displayName?.text ?? '',
      formatted_address: p.formattedAddress ?? '',
      city,
      state,
      lat: p.location?.latitude ?? null,
      lng: p.location?.longitude ?? null,
      website: p.websiteUri ?? null,
    }
  })

  return NextResponse.json(results)
}
