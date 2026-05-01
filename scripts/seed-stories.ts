import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const MANIFEST_PATH = path.resolve(process.cwd(), 'scripts/seed-manifest.json')

// Public Unsplash dog images for story thumbnails
const STORY_IMAGES = [
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80',
  'https://images.unsplash.com/photo-1552053831-71594a27632d?w=800&q=80',
  'https://images.unsplash.com/photo-1477884213360-7e9d7dcc1e48?w=800&q=80',
  'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=800&q=80',
  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&q=80',
  'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=800&q=80',
  'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&q=80',
  'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=800&q=80',
  'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&q=80',
  'https://images.unsplash.com/photo-1601979031925-424e53b6caaa?w=800&q=80',
]

const CAPTIONS = [
  'golden hour hits different with her',
  'park day 🐾',
  'he found a stick and now it\'s his whole personality',
  'morning walk crew',
  'zero chill, maximum zoomies',
  'obsessed with this face',
  'she\'s been staring at me for 20 minutes',
  'sniff everything, trust no one',
  null,
  null,
]

// Random timestamp within the last 20 hours (stories expire at 24h)
function recentTimestamp(maxHoursAgo: number): string {
  const ms = Math.random() * maxHoursAgo * 60 * 60 * 1000
  return new Date(Date.now() - ms).toISOString()
}

async function main() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error('No seed-manifest.json found. Run seed.ts first.')
    process.exit(1)
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')) as {
    users: { id: string; email: string }[]
  }

  const userIds = manifest.users.map((u) => u.id)
  console.log(`\nSeeding stories for ${userIds.length} users`)

  // Pre-fetch all dogs grouped by owner
  const { data: allDogs, error: dogsErr } = await supabase
    .from('dog')
    .select('id, name, owner_id')
    .in('owner_id', userIds)

  if (dogsErr) { console.error('Error fetching dogs:', dogsErr.message); process.exit(1) }

  const dogsByOwner: Record<string, { id: string; name: string }[]> = {}
  for (const dog of allDogs ?? []) {
    if (!dogsByOwner[dog.owner_id]) dogsByOwner[dog.owner_id] = []
    dogsByOwner[dog.owner_id].push({ id: dog.id, name: dog.name })
  }

  console.log('\n── Stories ─────────────────────────────────')

  let created = 0
  let failed = 0
  let imageCursor = 0
  let captionCursor = 0

  for (let i = 0; i < manifest.users.length; i++) {
    const user = manifest.users[i]
    const userDogs = dogsByOwner[user.id] ?? []
    // Give each user 1–3 active stories
    const storyCount = (i % 3) + 1

    for (let s = 0; s < storyCount; s++) {
      const mediaUrl = STORY_IMAGES[imageCursor++ % STORY_IMAGES.length]
      const caption = CAPTIONS[captionCursor++ % CAPTIONS.length]
      const dog = userDogs[s % userDogs.length] ?? null
      const createdAt = recentTimestamp(20)
      const expiresAt = new Date(new Date(createdAt).getTime() + 24 * 60 * 60 * 1000).toISOString()

      const { error } = await supabase.from('story').insert({
        author_id: user.id,
        dog_id: dog?.id ?? null,
        media_url: mediaUrl,
        media_type: 'image',
        caption,
        created_at: createdAt,
        expires_at: expiresAt,
      })

      if (error) {
        console.error(`  ✗ ${user.email.split('@')[0]} story ${s + 1}: ${error.message}`)
        failed++
        continue
      }

      const dogLabel = dog ? `[${dog.name}]` : '[no dog]'
      const captionLabel = caption ? `"${caption.slice(0, 35)}"` : '[no caption]'
      console.log(`  ✓ ${user.email.split('@')[0].padEnd(16)} ${captionLabel.padEnd(40)} ${dogLabel}`)
      created++
    }
  }

  console.log('\n── Summary ─────────────────────────────────')
  console.log(`  stories created: ${created}`)
  if (failed > 0) console.log(`  failed:         ${failed}`)
  console.log('\nDone!')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
