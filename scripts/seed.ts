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

// ─── Data definitions ────────────────────────────────────────────────────────

const BOSTON_USERS = [
  { email: 'sarahchen@dogish.com',    display_name: 'Sarah Chen',     username: 'sarahchen',    location: 'Boston, MA' },
  { email: 'jamieobrien@dogish.com',  display_name: 'Jamie O\'Brien', username: 'jamieobrien',  location: 'Boston, MA' },
  { email: 'priyapatel@dogish.com',   display_name: 'Priya Patel',    username: 'priyapatel',   location: 'Cambridge, MA' },
  { email: 'tomkelly@dogish.com',     display_name: 'Tom Kelly',      username: 'tomkelly',     location: 'Boston, MA' },
  { email: 'lauramarcus@dogish.com',  display_name: 'Laura Marcus',   username: 'lauramarcus',  location: 'Somerville, MA' },
  { email: 'devonwright@dogish.com',  display_name: 'Devon Wright',   username: 'devonwright',  location: 'Boston, MA' },
  { email: 'nicolekim@dogish.com',    display_name: 'Nicole Kim',     username: 'nicolekim',    location: 'Brookline, MA' },
  { email: 'brendanflynn@dogish.com', display_name: 'Brendan Flynn',  username: 'brendanflynn', location: 'Boston, MA' },
  { email: 'amandatorres@dogish.com', display_name: 'Amanda Torres',  username: 'amandatorres', location: 'Boston, MA' },
  { email: 'mikesullivan@dogish.com', display_name: 'Mike Sullivan',  username: 'mikesullivan', location: 'Boston, MA' },
]

const CHICAGO_USERS = [
  { email: 'jessicapark@dogish.com',    display_name: 'Jessica Park',    username: 'jessicapark',    location: 'Chicago, IL' },
  { email: 'ryanmurphy@dogish.com',     display_name: 'Ryan Murphy',     username: 'ryanmurphy',     location: 'Chicago, IL' },
  { email: 'carolinehall@dogish.com',   display_name: 'Caroline Hall',   username: 'carolinehall',   location: 'Chicago, IL' },
  { email: 'alexrivera@dogish.com',     display_name: 'Alex Rivera',     username: 'alexrivera',     location: 'Chicago, IL' },
  { email: 'madelinecooper@dogish.com', display_name: 'Madeline Cooper', username: 'madelinecooper', location: 'Evanston, IL' },
  { email: 'zachthompson@dogish.com',   display_name: 'Zach Thompson',   username: 'zachthompson',   location: 'Chicago, IL' },
  { email: 'oliviabennett@dogish.com',  display_name: 'Olivia Bennett',  username: 'oliviabennett',  location: 'Chicago, IL' },
  { email: 'nathangoldberg@dogish.com', display_name: 'Nathan Goldberg', username: 'nathangoldberg', location: 'Chicago, IL' },
  { email: 'sophialee@dogish.com',      display_name: 'Sophia Lee',      username: 'sophialee',      location: 'Oak Park, IL' },
]

// Dog photo avatar URLs (Unsplash)
const DOG_AVATARS = [
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&q=80',
  'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&q=80',
  'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=400&q=80',
  'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=400&q=80',
  'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=400&q=80',
  'https://images.unsplash.com/photo-1529429617124-95b109e86bb8?w=400&q=80',
  'https://images.unsplash.com/photo-1508532566027-b2032cd8a715?w=400&q=80',
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&q=80',
  'https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?w=400&q=80',
  'https://images.unsplash.com/photo-1601979031925-424e53b6caaa?w=400&q=80',
  'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80',
  'https://images.unsplash.com/photo-1477884213360-7e9d7dcc1e48?w=400&q=80',
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&q=80',
]

// Post photo URLs (Unsplash dog photos)
const POST_PHOTOS = [
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80',
  'https://images.unsplash.com/photo-1552053831-71594a27632d?w=800&q=80',
  'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=800&q=80',
  'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=800&q=80',
  'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=800&q=80',
  'https://images.unsplash.com/photo-1529429617124-95b109e86bb8?w=800&q=80',
  'https://images.unsplash.com/photo-1508532566027-b2032cd8a715?w=800&q=80',
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&q=80',
  'https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?w=800&q=80',
  'https://images.unsplash.com/photo-1601979031925-424e53b6caaa?w=800&q=80',
  'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80',
]

const POST_CAPTIONS = [
  'Morning walk vibes 🌅',
  'Park day with my best buddy',
  'Someone discovered the treat jar',
  'Golden hour and golden paws',
  'This face though 🥺',
  'Zoomies at the dog park today',
  'Sunday snuggles > everything',
  'My coworker for the day',
  'First snow and loving it!',
  'Caught mid-zoomie',
  'Beach bum in training',
  'The living room is their kingdom',
]

type DogDef = {
  name: string
  ownerUsername: string
  breedName: string
  size: 'xs' | 'small' | 'medium' | 'large' | 'xl'
  sex: 'male' | 'female' | 'unknown'
  birthday: string
  bio: string
  avatarIdx: number
}

const DOGS: DogDef[] = [
  // Boston dogs
  { name: 'Biscuit',  ownerUsername: 'sarahchen',    breedName: 'Golden Retriever',    size: 'large',  sex: 'male',   birthday: '2020-03-12', bio: 'Professional ball chaser and nap enthusiast.',   avatarIdx: 0 },
  { name: 'Mochi',    ownerUsername: 'priyapatel',   breedName: 'Shiba Inu',           size: 'medium', sex: 'female', birthday: '2021-07-04', bio: 'Doge energy. Much wow.',                         avatarIdx: 1 },
  { name: 'Bear',     ownerUsername: 'tomkelly',     breedName: 'Bernese Mountain Dog', size: 'xl',     sex: 'male',   birthday: '2019-11-20', bio: 'Big dog, bigger heart.',                         avatarIdx: 2 },
  { name: 'Luna',     ownerUsername: 'lauramarcus',  breedName: 'Husky',               size: 'large',  sex: 'female', birthday: '2022-01-15', bio: 'Talks back constantly.',                         avatarIdx: 3 },
  { name: 'Noodle',   ownerUsername: 'nicolekim',    breedName: 'Dachshund',           size: 'xs',     sex: 'female', birthday: '2020-09-05', bio: 'Long boi. Short legs. Big personality.',         avatarIdx: 4 },
  { name: 'Pretzel',  ownerUsername: 'nicolekim',    breedName: 'Dachshund',           size: 'xs',     sex: 'male',   birthday: '2021-02-14', bio: "Noodle's partner in crime.",                     avatarIdx: 5 },
  { name: 'Fig',      ownerUsername: 'brendanflynn', breedName: 'French Bulldog',      size: 'small',  sex: 'male',   birthday: '2021-05-30', bio: 'Snorts and snoots.',                             avatarIdx: 6 },
  { name: 'Clover',   ownerUsername: 'devonwright',  breedName: 'Border Collie',       size: 'medium', sex: 'female', birthday: '2020-06-18', bio: 'Herds everything, including the Roomba.',        avatarIdx: 7 },
  { name: 'Archie',   ownerUsername: 'mikesullivan', breedName: 'Labrador Retriever',  size: 'large',  sex: 'male',   birthday: '2019-08-22', bio: 'Will fetch for food.',                           avatarIdx: 8 },
  { name: 'Beans',    ownerUsername: 'amandatorres', breedName: 'Beagle',              size: 'medium', sex: 'female', birthday: '2022-04-10', bio: 'Nose-first into everything.',                    avatarIdx: 9 },
  { name: 'Peanut',   ownerUsername: 'jamieobrien',  breedName: 'Chihuahua',           size: 'xs',     sex: 'male',   birthday: '2020-12-01', bio: 'Tiny but fearless.',                             avatarIdx: 10 },
  { name: 'Scout',    ownerUsername: 'jamieobrien',  breedName: 'Australian Shepherd', size: 'medium', sex: 'female', birthday: '2021-09-14', bio: 'Adventure dog in training.',                     avatarIdx: 11 },
  { name: 'Maple',    ownerUsername: 'sarahchen',    breedName: 'Golden Retriever',    size: 'large',  sex: 'female', birthday: '2022-03-08', bio: "Biscuit's little sister.",                       avatarIdx: 12 },
  { name: 'Waffles',  ownerUsername: 'devonwright',  breedName: 'Corgi',               size: 'small',  sex: 'male',   birthday: '2021-11-11', bio: 'Butt wiggles and herding instincts.',            avatarIdx: 13 },
  // Chicago dogs
  { name: 'Pepper',   ownerUsername: 'jessicapark',    breedName: 'Dalmatian',           size: 'large',  sex: 'female', birthday: '2020-07-04', bio: 'Spotted and stylish.',                           avatarIdx: 0 },
  { name: 'Coco',     ownerUsername: 'ryanmurphy',     breedName: 'Labrador Retriever',  size: 'large',  sex: 'female', birthday: '2021-01-20', bio: 'Obsessed with swimming.',                        avatarIdx: 1 },
  { name: 'Duke',     ownerUsername: 'carolinehall',   breedName: 'German Shepherd',     size: 'large',  sex: 'male',   birthday: '2019-06-15', bio: 'Noble and dramatic.',                            avatarIdx: 2 },
  { name: 'Olive',    ownerUsername: 'alexrivera',     breedName: 'Italian Greyhound',   size: 'small',  sex: 'female', birthday: '2022-02-28', bio: 'Sprints and naps. Repeat.',                      avatarIdx: 3 },
  { name: 'Dumpling', ownerUsername: 'madelinecooper', breedName: 'Chow Chow',           size: 'medium', sex: 'male',   birthday: '2020-10-10', bio: 'Lion mane energy.',                              avatarIdx: 4 },
  { name: 'Bagel',    ownerUsername: 'madelinecooper', breedName: 'Beagle',              size: 'medium', sex: 'female', birthday: '2021-08-25', bio: "Dumpling's best friend and chaos agent.",        avatarIdx: 5 },
  { name: 'Remy',     ownerUsername: 'zachthompson',   breedName: 'Poodle',              size: 'medium', sex: 'male',   birthday: '2021-03-15', bio: 'Curly and clever.',                              avatarIdx: 6 },
  { name: 'Stella',   ownerUsername: 'oliviabennett',  breedName: 'Boxer',               size: 'large',  sex: 'female', birthday: '2020-05-05', bio: 'Bouncy. Very bouncy.',                           avatarIdx: 7 },
  { name: 'Churro',   ownerUsername: 'nathangoldberg', breedName: 'Chihuahua',           size: 'xs',     sex: 'male',   birthday: '2022-06-20', bio: 'Pequeño but mighty.',                            avatarIdx: 8 },
  { name: 'Boba',     ownerUsername: 'sophialee',      breedName: 'Shih Tzu',            size: 'small',  sex: 'female', birthday: '2021-04-01', bio: 'Fluffy and fabulous.',                           avatarIdx: 9 },
  { name: 'Hugo',     ownerUsername: 'nathangoldberg', breedName: 'Rottweiler',          size: 'xl',     sex: 'male',   birthday: '2019-12-25', bio: 'Gentle giant with a big bark.',                  avatarIdx: 10 },
  { name: 'Mango',    ownerUsername: 'ryanmurphy',     breedName: 'Vizsla',              size: 'large',  sex: 'male',   birthday: '2020-08-15', bio: 'Velcro dog. Never leaves my side.',              avatarIdx: 11 },
  { name: 'Hazel',    ownerUsername: 'jessicapark',    breedName: 'Cocker Spaniel',      size: 'medium', sex: 'female', birthday: '2021-10-30', bio: 'Floppy ears and gentle soul.',                   avatarIdx: 12 },
  { name: 'Tofu',     ownerUsername: 'sophialee',      breedName: 'Samoyed',             size: 'large',  sex: 'male',   birthday: '2022-01-01', bio: 'Pure white. Pure joy.',                          avatarIdx: 13 },
]

const PLACES = [
  { name: 'Cold Spring Park Dog Run', category: 'park',  address: '1250 Beacon St',       city: 'Newton',  state: 'MA', lat: 42.3288, lng: -71.2144 },
  { name: 'Richard J. McGrath Park',  category: 'park',  address: '1576 Washington St',   city: 'Newton',  state: 'MA', lat: 42.3428, lng: -71.2351 },
  { name: 'Peters Park Dog Run',      category: 'park',  address: '1035 Columbus Ave',    city: 'Boston',  state: 'MA', lat: 42.3433, lng: -71.0772 },
  { name: 'Jamaica Pond Trails',      category: 'trail', address: '507 Pond St',          city: 'Boston',  state: 'MA', lat: 42.3210, lng: -71.1153 },
  { name: 'Wiggly Field Dog Park',    category: 'park',  address: '2645 N Sheffield Ave', city: 'Chicago', state: 'IL', lat: 41.9302, lng: -87.6531 },
  { name: 'Montrose Dog Beach',       category: 'park',  address: '601 W Montrose Ave',   city: 'Chicago', state: 'IL', lat: 41.9656, lng: -87.6389 },
  { name: 'Horner Park Dog Area',     category: 'park',  address: '2741 W Montrose Ave',  city: 'Chicago', state: 'IL', lat: 41.9589, lng: -87.6857 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomPast(daysAgo: number) {
  const d = new Date(Date.now() - Math.random() * daysAgo * 24 * 60 * 60 * 1000)
  return d.toISOString()
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const stats = { users: 0, dogs: 0, places: 0, follows: 0, posts: 0, likes: 0, saves: 0 }

  // 1. Create auth users + fetch their human IDs
  const allUserDefs = [...BOSTON_USERS, ...CHICAGO_USERS]
  const usernameToUserId: Record<string, string> = {}
  const seededUsers: { id: string; email: string }[] = []

  console.log('\n── Users ──────────────────────────────────')
  for (const u of allUserDefs) {
    // Check if user already exists via human table
    const { data: existing } = await supabase
      .from('human')
      .select('id')
      .eq('username', u.username)
      .maybeSingle()

    if (existing) {
      usernameToUserId[u.username] = existing.id
      seededUsers.push({ id: existing.id, email: u.email })
      console.log(`  skip  ${u.username}`)
      continue
    }

    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: u.email,
      password: 'Dogish123!',
      email_confirm: true,
    })
    if (authErr) {
      if (authErr.message.includes('already been registered')) {
        const { data: listData } = await supabase.auth.admin.listUsers()
        const found = listData?.users.find((au) => au.email === u.email)
        if (found) {
          usernameToUserId[u.username] = found.id
          seededUsers.push({ id: found.id, email: u.email })
          console.log(`  exists  ${u.username}`)
        }
        continue
      }
      console.error(`  error creating ${u.email}:`, authErr.message)
      continue
    }

    const uid = authData.user.id
    usernameToUserId[u.username] = uid
    seededUsers.push({ id: uid, email: u.email })

    const { error: humanErr } = await supabase
      .from('human')
      .update({ display_name: u.display_name, username: u.username, location: u.location })
      .eq('id', uid)

    if (humanErr) console.error(`  error updating human ${u.username}:`, humanErr.message)
    else {
      stats.users++
      console.log(`  created ${u.username}`)
    }
  }

  // 2. Look up breed IDs (create missing ones)
  const breedNames = [...new Set(DOGS.map((d) => d.breedName))]
  const { data: breedsRaw } = await supabase.from('breed').select('id, name').in('name', breedNames)
  const breedNameToId: Record<string, string> = {}
  for (const b of breedsRaw ?? []) breedNameToId[b.name] = b.id

  for (const name of breedNames) {
    if (!breedNameToId[name]) {
      const { data, error } = await supabase.from('breed').insert({ name }).select('id').single()
      if (error) console.error(`  error creating breed ${name}:`, error.message)
      else { breedNameToId[name] = data.id; console.log(`  breed created: ${name}`) }
    }
  }

  // 3. Create dogs
  console.log('\n── Dogs ──────────────────────────────────')
  const dogNameOwnerToId: Record<string, string> = {}

  for (const d of DOGS) {
    const ownerId = usernameToUserId[d.ownerUsername]
    if (!ownerId) { console.log(`  skip ${d.name} (owner ${d.ownerUsername} not found)`); continue }

    const { data: existingDog } = await supabase
      .from('dog').select('id').eq('owner_id', ownerId).eq('name', d.name).maybeSingle()

    if (existingDog) {
      dogNameOwnerToId[`${d.ownerUsername}/${d.name}`] = existingDog.id
      console.log(`  skip  ${d.ownerUsername}/${d.name}`)
      continue
    }

    const { data: dogData, error: dogErr } = await supabase
      .from('dog')
      .insert({
        owner_id: ownerId,
        name: d.name,
        avatar: DOG_AVATARS[d.avatarIdx % DOG_AVATARS.length],
        birthday: d.birthday,
        size: d.size,
        sex: d.sex,
        bio: d.bio,
        is_private: false,
      })
      .select('id')
      .single()

    if (dogErr) { console.error(`  error creating dog ${d.name}:`, dogErr.message); continue }

    dogNameOwnerToId[`${d.ownerUsername}/${d.name}`] = dogData.id
    stats.dogs++
    console.log(`  created ${d.name} (${d.ownerUsername})`)

    const breedId = breedNameToId[d.breedName]
    if (breedId) {
      await supabase.from('dog_breeds').insert({ dog_id: dogData.id, breed_id: breedId, is_primary: true })
    }
  }

  // 4. Create places
  console.log('\n── Places ─────────────────────────────────')
  const seededPlaceIds: string[] = []

  for (const p of PLACES) {
    const { data: existingPlace } = await supabase
      .from('place').select('id').eq('name', p.name).eq('city', p.city).maybeSingle()

    if (existingPlace) {
      seededPlaceIds.push(existingPlace.id)
      console.log(`  skip  ${p.name}`)
      continue
    }

    const { data: placeData, error: placeErr } = await supabase
      .from('place').insert(p).select('id').single()
    if (placeErr) console.error(`  error creating place ${p.name}:`, placeErr.message)
    else {
      seededPlaceIds.push(placeData.id)
      stats.places++
      console.log(`  created ${p.name}`)
    }
  }

  // 5. Follow relationships
  console.log('\n── Follows ────────────────────────────────')
  const bostonIds = BOSTON_USERS.map((u) => usernameToUserId[u.username]).filter(Boolean)
  const chicagoIds = CHICAGO_USERS.map((u) => usernameToUserId[u.username]).filter(Boolean)

  const followPairs: [string, string][] = []
  for (let i = 0; i < bostonIds.length; i++) {
    for (let j = 1; j <= 4; j++) {
      const target = bostonIds[(i + j) % bostonIds.length]
      if (target) followPairs.push([bostonIds[i], target])
    }
  }
  for (let i = 0; i < chicagoIds.length; i++) {
    for (let j = 1; j <= 4; j++) {
      const target = chicagoIds[(i + j) % chicagoIds.length]
      if (target) followPairs.push([chicagoIds[i], target])
    }
  }
  for (let i = 0; i < 3; i++) {
    if (bostonIds[i] && chicagoIds[i]) {
      followPairs.push([bostonIds[i], chicagoIds[i]])
      followPairs.push([chicagoIds[i], bostonIds[i]])
    }
  }

  for (const [followerId, targetId] of followPairs) {
    if (!followerId || !targetId) continue
    const { error } = await supabase.from('follow').insert({
      follower_id: followerId, target_type: 'human', target_human_id: targetId,
    })
    if (error && error.code !== '23505') console.error(`  follow error:`, error.message)
    else if (!error) stats.follows++
  }
  console.log(`  ${stats.follows} human follows created`)

  const bostonDogIds = Object.entries(dogNameOwnerToId)
    .filter(([key]) => BOSTON_USERS.some((u) => key.startsWith(u.username + '/')))
    .map(([, id]) => id)
  const chicagoDogIds = Object.entries(dogNameOwnerToId)
    .filter(([key]) => CHICAGO_USERS.some((u) => key.startsWith(u.username + '/')))
    .map(([, id]) => id)

  let dogFollows = 0
  for (const followerId of bostonIds.slice(0, 5)) {
    for (const dogId of bostonDogIds.slice(0, 6)) {
      const { error } = await supabase.from('follow').insert({
        follower_id: followerId, target_type: 'dog', target_dog_id: dogId,
      })
      if (!error) dogFollows++
    }
  }
  for (const followerId of chicagoIds.slice(0, 5)) {
    for (const dogId of chicagoDogIds.slice(0, 6)) {
      const { error } = await supabase.from('follow').insert({
        follower_id: followerId, target_type: 'dog', target_dog_id: dogId,
      })
      if (!error) dogFollows++
    }
  }
  console.log(`  ${dogFollows} dog follows created`)

  // 6. Posts
  console.log('\n── Posts ──────────────────────────────────')
  const allDogIds = Object.values(dogNameOwnerToId)
  const allUserIds = Object.values(usernameToUserId)

  const postIds: string[] = []

  for (let i = 0; i < 12; i++) {
    const authorId = allUserIds[i % allUserIds.length]
    const { data: postData, error: postErr } = await supabase
      .from('post')
      .insert({
        author_id: authorId,
        post_type: 'photo',
        body: POST_CAPTIONS[i % POST_CAPTIONS.length],
        images: [POST_PHOTOS[i % POST_PHOTOS.length]],
        is_private: false,
        created_at: randomPast(25),
      })
      .select('id')
      .single()

    if (postErr) { console.error(`  error creating post ${i}:`, postErr.message); continue }

    postIds.push(postData.id)
    stats.posts++
    console.log(`  post ${i + 1}: ${POST_CAPTIONS[i % POST_CAPTIONS.length].slice(0, 30)}`)

    const taggedDogs = allDogIds.slice((i * 2) % allDogIds.length, (i * 2) % allDogIds.length + 2)
    for (const dogId of taggedDogs) {
      await supabase.from('post_dogs').insert({ post_id: postData.id, dog_id: dogId })
    }
  }

  // 7. Likes
  console.log('\n── Likes ──────────────────────────────────')
  for (const postId of postIds) {
    const likeCount = 2 + Math.floor(Math.random() * 5)
    const shuffled = [...allUserIds].sort(() => Math.random() - 0.5)
    for (let l = 0; l < likeCount && l < shuffled.length; l++) {
      const { error } = await supabase.from('like_').insert({ human_id: shuffled[l], post_id: postId })
      if (!error) stats.likes++
    }
  }
  console.log(`  ${stats.likes} likes created`)

  // 8. Saves
  console.log('\n── Saves ──────────────────────────────────')
  for (const postId of postIds) {
    const saveCount = 1 + Math.floor(Math.random() * 4)
    const shuffled = [...allUserIds].sort(() => Math.random() - 0.5)
    for (let s = 0; s < saveCount && s < shuffled.length; s++) {
      const { error } = await supabase
        .from('saved_post')
        .insert({ human_id: shuffled[s], post_id: postId, created_at: randomPast(25) })
      if (!error) stats.saves++
    }
  }
  console.log(`  ${stats.saves} saves created`)

  // 9. Write manifest
  const manifest = {
    seededAt: new Date().toISOString(),
    users: seededUsers,
    placeIds: seededPlaceIds,
  }
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`\n  manifest written → scripts/seed-manifest.json`)

  // ── Summary ───────────────────────────────
  console.log('\n── Summary ────────────────────────────────')
  console.log(`  users:   ${stats.users}`)
  console.log(`  dogs:    ${stats.dogs}`)
  console.log(`  places:  ${stats.places}`)
  console.log(`  follows: ${stats.follows} human + ${dogFollows} dog`)
  console.log(`  posts:   ${stats.posts}`)
  console.log(`  likes:   ${stats.likes}`)
  console.log(`  saves:   ${stats.saves}`)
  console.log('\nDone!')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
