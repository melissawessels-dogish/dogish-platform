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

async function main() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error('No seed-manifest.json found. Nothing to unseed.')
    process.exit(1)
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')) as {
    seededAt: string
    users: { id: string; email: string }[]
    placeIds: string[]
  }

  console.log(`\nUnseeding data from ${manifest.seededAt}`)
  console.log(`  ${manifest.users.length} users, ${manifest.placeIds.length} places\n`)

  let deletedUsers = 0
  let deletedPlaces = 0

  // Delete auth users — cascades via ON DELETE CASCADE to:
  //   human → dog, follow, like_, comment, saved_post, saved_folder, post (author_id)
  // saved_post rows are cleaned up automatically; no explicit delete needed.
  console.log('── Users ──────────────────────────────────')
  for (const u of manifest.users) {
    const { error } = await supabase.auth.admin.deleteUser(u.id)
    if (error) {
      if (error.message.includes('not found') || error.message.includes('User not found')) {
        console.log(`  not found  ${u.email}`)
      } else {
        console.error(`  error deleting ${u.email}:`, error.message)
      }
    } else {
      deletedUsers++
      console.log(`  deleted  ${u.email}`)
    }
  }

  // Delete places
  console.log('\n── Places ─────────────────────────────────')
  if (manifest.placeIds.length > 0) {
    const { error, count } = await supabase
      .from('place')
      .delete({ count: 'exact' })
      .in('id', manifest.placeIds)
    if (error) console.error('  error deleting places:', error.message)
    else {
      deletedPlaces = count ?? manifest.placeIds.length
      console.log(`  deleted ${deletedPlaces} place(s)`)
    }
  } else {
    console.log('  no places to delete')
  }

  // Remove manifest file
  fs.unlinkSync(MANIFEST_PATH)
  console.log('\n  manifest deleted')

  console.log('\n── Summary ────────────────────────────────')
  console.log(`  users deleted:  ${deletedUsers}`)
  console.log(`  places deleted: ${deletedPlaces}`)
  console.log('\nDone!')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
