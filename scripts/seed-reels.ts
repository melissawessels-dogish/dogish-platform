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

// Pexels public dog videos paired with Unsplash thumbnail images
const REELS: { video_url: string; thumbnail: string }[] = [
  {
    video_url: 'https://videos.pexels.com/video-files/853936/853936-hd_1280_720_25fps.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=800&q=80',
  },
  {
    video_url: 'https://videos.pexels.com/video-files/3045714/3045714-hd_1280_720_25fps.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80',
  },
]

const CAPTIONS = [
  'zoomies unlocked 🐾',
  'he saw the leash and completely lost it',
  'friday energy ✨',
  'obsessed with this weirdo',
  'morning routine ft. the most dramatic dog alive',
  'told her we were going to the park. this was her reaction.',
  'he does this every. single. time.',
  'chaos gremlin hours',
  'first swim of the season and she is NOT ready to leave',
  'caught him mid-zoomie and I am not okay',
  'the audacity of this dog',
  'sunday mode activated 😌',
  'the tail does not stop. ever.',
  'she heard the treat bag from three rooms away',
  'living his best life and honestly same',
  'this is what peak happiness looks like',
  'found him like this. no notes.',
  'unhinged and thriving',
  'she really said "catch me if you can"',
  'daily reminder that dogs are everything',
  'big dog, tiny attention span',
  'running like the yard is on fire for literally no reason',
  'he sprinted full speed into the door and then acted cool',
  'it never gets old. ever.',
  'the zoom before the nap 🌀',
  'she knew exactly what she was doing',
  'the most chaotic three seconds of my day',
]

// Spread timestamps evenly across the past 14 days
function randomPastMs(minDays: number, maxDays: number): string {
  const ms = (minDays + Math.random() * (maxDays - minDays)) * 24 * 60 * 60 * 1000
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
  console.log(`\nSeeding reels for ${userIds.length} users`)

  // Pre-fetch all dogs grouped by owner in one query
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

  console.log('\n── Reels ───────────────────────────────────')

  let created = 0
  let failed = 0
  let captionCursor = 0

  for (let i = 0; i < manifest.users.length; i++) {
    const user = manifest.users[i]
    const userDogs = dogsByOwner[user.id] ?? []
    // Alternate 2 / 3 / 2 / 3 … for variety
    const reelCount = i % 2 === 0 ? 2 : 3

    for (let r = 0; r < reelCount; r++) {
      const reel = REELS[(i + r) % REELS.length]
      const caption = CAPTIONS[captionCursor++ % CAPTIONS.length]
      // Spread across the past 14 days; later reels within a user are older
      const createdAt = randomPastMs(r * 2, r * 2 + 5)

      const { data: post, error: postErr } = await supabase
        .from('post')
        .insert({
          author_id: user.id,
          post_type: 'reel',
          body: caption,
          images: [reel.thumbnail],
          video_url: reel.video_url,
          is_private: false,
          created_at: createdAt,
        })
        .select('id')
        .single()

      if (postErr || !post) {
        console.error(`  ✗ ${user.email.split('@')[0]} reel ${r + 1}: ${postErr?.message}`)
        failed++
        continue
      }

      // Tag up to 2 of the user's dogs
      const dogsToTag = userDogs.slice(0, 2)
      for (const dog of dogsToTag) {
        await supabase.from('post_dogs').insert({ post_id: post.id, dog_id: dog.id })
      }

      const tagLine = dogsToTag.length > 0
        ? `[${dogsToTag.map((d) => d.name).join(', ')}]`
        : '[no dogs]'
      console.log(`  ✓ ${user.email.split('@')[0].padEnd(16)} "${caption.slice(0, 38)}"  ${tagLine}`)
      created++
    }
  }

  console.log('\n── Summary ─────────────────────────────────')
  console.log(`  reels created: ${created}`)
  if (failed > 0) console.log(`  failed:        ${failed}`)
  console.log('\nDone!')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
