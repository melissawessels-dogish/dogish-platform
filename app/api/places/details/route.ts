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
        'id,displayName,formattedAddress,location,websiteUri,addressComponents,photos,photos.name,photos.widthPx,photos.heightPx,photos.authorAttributions',
    },
  })

  if (!res.ok) return NextResponse.json(null)

  const p = await res.json()
  const { city, state } = extractCityState(p.addressComponents)
  const lat: number | null = p.location?.latitude ?? null
  const lng: number | null = p.location?.longitude ?? null

  // Try Places photo first
  let cover_image: string | null = null
  const firstPhoto = p.photos?.[0]
  console.log('[places/details] photos array:', JSON.stringify(p.photos?.slice(0, 1)))
  if (firstPhoto?.name) {
    try {
      const photoRes = await fetch(
        `https://places.googleapis.com/v1/${firstPhoto.name}/media?maxWidthPx=800&skipHttpRedirect=true&key=${API_KEY}`,
        { cache: 'no-store' }
      )
      if (photoRes.ok) {
        const photoData = await photoRes.json()
        cover_image = photoData.photoUri ?? null
      }
    } catch { /* fall through to Street View */ }
  }

  // Street View fallback — accepts lat/lng OR an address string
  if (!cover_image) {
    const svLocation = (lat !== null && lng !== null)
      ? `${lat},${lng}`
      : encodeURIComponent(p.formattedAddress ?? '')
    if (svLocation) {
      cover_image = `https://maps.googleapis.com/maps/api/streetview?size=800x400&location=${svLocation}&key=${API_KEY}`
    }
  }

  console.log('[places/details] lat:', lat, '| lng:', lng, '| cover_image:', cover_image ? 'set' : 'null')

  return NextResponse.json({
    place_id: `places/${p.id}`,
    name: p.displayName?.text ?? '',
    formatted_address: p.formattedAddress ?? '',
    city,
    state,
    lat,
    lng,
    website: p.websiteUri ?? null,
    cover_image,
  })
}
