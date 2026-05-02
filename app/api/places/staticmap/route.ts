import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY

export async function GET(req: NextRequest) {
  if (!API_KEY) return new NextResponse(null, { status: 400 })

  // Accept multiple ?m=lat,lng params — one per marker
  const markers = req.nextUrl.searchParams.getAll('m')
  if (!markers.length) return new NextResponse(null, { status: 400 })

  const markerParams = markers.map((m) => `markers=color:red|${encodeURIComponent(m)}`).join('&')
  const url = `https://maps.googleapis.com/maps/api/staticmap?size=800x320&scale=2&${markerParams}&key=${API_KEY}`

  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    console.error('[staticmap] Google responded', res.status)
    return new NextResponse(null, { status: res.status })
  }

  const buffer = await res.arrayBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': res.headers.get('Content-Type') ?? 'image/png',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
