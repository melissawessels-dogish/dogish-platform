import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local')
  const lines = readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      process.env[match[1].trim()] = match[2].trim()
    }
  }
}

loadEnv()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, key)

const BREEDS = [
  // AKC / popular purebreds
  'Labrador Retriever', 'French Bulldog', 'Golden Retriever', 'German Shepherd',
  'Poodle', 'Bulldog', 'Beagle', 'Rottweiler', 'German Shorthaired Pointer',
  'Dachshund', 'Pembroke Welsh Corgi', 'Australian Shepherd', 'Yorkshire Terrier',
  'Boxer', 'Cavalier King Charles Spaniel', 'Doberman Pinscher', 'Great Dane',
  'Miniature Schnauzer', 'Siberian Husky', 'Bernese Mountain Dog', 'Shih Tzu',
  'Boston Terrier', 'Havanese', 'Shetland Sheepdog', 'Brittany',
  'English Springer Spaniel', 'Pug', 'Border Collie', 'Maltese', 'Cocker Spaniel',
  'Weimaraner', 'Vizsla', 'Collie', 'Basset Hound', 'Newfoundland',
  'Belgian Malinois', 'Chihuahua', 'Bichon Frise', 'West Highland White Terrier',
  'Rhodesian Ridgeback', 'Bloodhound', 'Akita', 'Portuguese Water Dog', 'Samoyed',
  'Alaskan Malamute', 'Whippet', 'Soft Coated Wheaten Terrier', 'Dalmatian',
  'Irish Setter', 'Saint Bernard', 'Pomeranian', 'Scottish Terrier', 'Bull Terrier',
  'Lhasa Apso', 'Chow Chow', 'Italian Greyhound', 'Miniature Pinscher',
  'Airedale Terrier', 'Cairn Terrier', 'Greyhound', 'Mixed Breed',
  // Doodles & designer mixes
  'Goldendoodle', 'Labradoodle', 'Bernedoodle', 'Aussiedoodle', 'Cockapoo',
  'Maltipoo', 'Schnoodle', 'Sheepadoodle', 'Cavapoo', 'Pomapoo', 'Yorkipoo',
  'Boxerdoodle', 'Newfypoo', 'Saint Berdoodle', 'Irish Doodle',
  'Mini Goldendoodle', 'Mini Labradoodle', 'Mini Bernedoodle', 'Mini Aussiedoodle',
  'Teddy Bear', 'Puggle', 'Morkie', 'Shorkie', 'Chorkie', 'Chiweenie', 'Pomchi',
  'Maltese Shih Tzu', 'Huskydoodle', 'Goberian', 'Borador', 'Springador',
  'Beagador', 'Jackador', 'Cavachon', 'Cavamalt', 'Poochon', 'Westiepoo', 'Bolonese',
  // Terriers
  'Toy Fox Terrier', 'Rat Terrier', 'Jack Russell Terrier', 'Miniature Bull Terrier',
  'Staffordshire Bull Terrier', 'American Staffordshire Terrier', 'American Pit Bull Terrier',
  // Mastiff / guardian
  'Cane Corso', 'Dogo Argentino', 'Boerboel', 'Leonberger', 'Great Pyrenees',
  'Anatolian Shepherd', 'Kangal', 'Tibetan Mastiff', 'Neapolitan Mastiff',
  'English Mastiff', 'Bullmastiff', 'Dogue de Bordeaux', 'Fila Brasileiro', 'Presa Canario',
  // Sighthounds
  'Afghan Hound', 'Saluki', 'Borzoi', 'Ibizan Hound', 'Pharaoh Hound', 'Azawakh',
  // Scent hounds
  'Plott Hound', 'Black and Tan Coonhound', 'Redbone Coonhound',
  'Treeing Walker Coonhound', 'Bluetick Coonhound', 'American English Coonhound', 'Harrier',
  // Nordic / spitz
  'Finnish Spitz', 'Norwegian Elkhound', 'Swedish Vallhund', 'Icelandic Sheepdog',
  // Swiss mountain dogs
  'Entlebucher Mountain Dog', 'Appenzeller Sennenhund', 'Greater Swiss Mountain Dog',
  // Rare / international
  'Xoloitzcuintli', 'Chinese Crested', 'Lowchen', 'Coton de Tulear', 'Biewer Terrier',
  'Russian Toy', 'Volpino Italiano', 'Lagotto Romagnolo', 'Bracco Italiano',
  'Spinone Italiano', 'Segugio Italiano',
  // Herding / working
  'Catahoula Leopard Dog', 'Louisiana Catahoula', 'Blue Heeler', 'Red Heeler',
  'Australian Cattle Dog', 'Australian Kelpie', 'McNab',
  'Miniature American Shepherd', 'Toy American Shepherd',
  // Dachshund variants
  'Longhaired Dachshund', 'Wirehaired Dachshund',
  // Golden Retriever variants
  'English Cream Golden Retriever',
]

async function seed() {
  const { data: existing, error: fetchError } = await supabase
    .from('breed')
    .select('name')

  if (fetchError) {
    console.error('Failed to fetch existing breeds:', fetchError.message)
    process.exit(1)
  }

  const existingNames = new Set((existing ?? []).map((r: { name: string }) => r.name))
  const toInsert = BREEDS.filter((name) => !existingNames.has(name)).map((name) => ({ name }))

  if (toInsert.length === 0) {
    console.log('All breeds already exist — nothing to insert.')
    return
  }

  const { error: insertError } = await supabase.from('breed').insert(toInsert)

  if (insertError) {
    console.error('Insert failed:', insertError.message)
    process.exit(1)
  }

  console.log(`Inserted ${toInsert.length} breed(s):`)
  toInsert.forEach((b) => console.log(` • ${b.name}`))
}

seed()
