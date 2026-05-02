import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY

type AddressComponent = {
  longText: string
  shortText: string
  types: string[]
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
  const placeId = req.nextUrl.searchParams.get('place_id')?.trim()
  if (!placeId) return NextResponse.json(null)
  if (!API_KEY) return NextResponse.json(null)

  const res = await fetch(`https://places.googleapis.com/v1/${placeId}`, {
    cache: 'no-store',
    headers: {
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask':
        'id,displayName,formattedAddress,location,websiteUri,addressComponents,photos',
    },
  })

  if (!res.ok) return NextResponse.json(null)

  const p = await res.json()
  const { city, state } = extractCityState(p.addressComponents)

  // Fetch first photo URL if available
  let cover_image: string | null = null
  const firstPhoto = p.photos?.[0]
  if (firstPhoto?.name) {
    const photoRes = await fetch(
      `https://places.googleapis.com/v1/${firstPhoto.name}/media?maxWidthPx=800&skipHttpRedirect=true&key=${API_KEY}`,
      { cache: 'no-store' }
    )
    if (photoRes.ok) {
      const photoData = await photoRes.json()
      cover_image = photoData.photoUri ?? null
    }
  }

  return NextResponse.json({
    place_id: `places/${p.id}`,
    name: p.displayName?.text ?? '',
    formatted_address: p.formattedAddress ?? '',
    city,
    state,
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
    website: p.websiteUri ?? null,
    cover_image,
  })
}
