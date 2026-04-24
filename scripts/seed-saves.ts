import * as dotenv from 'dotenv'
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

async function main() {
  // Fetch all posts (id + author_id)
  const { data: posts, error: postsErr } = await supabase
    .from('post')
    .select('id, author_id')
  if (postsErr) { console.error('Error fetching posts:', postsErr.message); process.exit(1) }
  console.log(`Found ${posts?.length ?? 0} posts`)

  // Resolve the admin account's human ID so we can exclude it
  const { data: adminRow } = await supabase
    .from('human')
    .select('id')
    .eq('username', 'melissawessels')
    .maybeSingle()
  const adminId = adminRow?.id ?? ''

  // Fetch all human IDs except the admin account
  const humansQuery = supabase.from('human').select('id')
  const { data: humans, error: humansErr } = await (adminId ? humansQuery.neq('id', adminId) : humansQuery)
  if (humansErr) { console.error('Error fetching humans:', humansErr.message); process.exit(1) }
  const humanIds = (humans ?? []).map((h) => h.id as string)
  console.log(`Found ${humanIds.length} humans`)

  let saves = 0
  let skipped = 0

  for (const post of posts ?? []) {
    const eligible = humanIds.filter((id) => id !== post.author_id)
    if (eligible.length === 0) continue

    const shuffled = [...eligible].sort(() => Math.random() - 0.5)
    const saveCount = 1 + Math.floor(Math.random() * 4)

    for (let i = 0; i < saveCount && i < shuffled.length; i++) {
      const { error } = await supabase
        .from('saved_post')
        .insert({ human_id: shuffled[i], post_id: post.id })
      if (error) {
        if (error.code === '23505') skipped++ // already saved
        else console.error(`  insert error (post ${post.id}):`, error.message)
      } else {
        saves++
      }
    }
  }

  console.log(`\nDone — ${saves} saves created, ${skipped} duplicates skipped`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
