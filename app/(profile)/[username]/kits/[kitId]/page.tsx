export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import KitItemsSection, { type KitItem } from './KitItemsSection'
import DeleteKitButton from './DeleteKitButton'
import { slugify } from '@/lib/slugify'

type Kit = {
  id: string
  title: string
  type: string | null
  description: string | null
  cover_image: string | null
  is_private: boolean
  is_system: boolean
  owner_id: string
}

type Owner = {
  id: string
  display_name: string | null
  username: string | null
  avatar: string | null
}

type TaggedDog = {
  id: string
  name: string
  avatar: string | null
}

export default async function KitDetailPage({
  params,
}: {
  params: Promise<{ username: string; kitId: string }>
}) {
  const { username, kitId } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: kitRaw } = await admin
    .from('kit')
    .select('id, title, type, description, cover_image, is_private, is_system, owner_id')
    .eq('id', kitId)
    .maybeSingle()

  if (!kitRaw) notFound()
  const kit = kitRaw as Kit

  const { data: ownerRaw } = await admin
    .from('human')
    .select('id, display_name, username, avatar')
    .eq('id', kit.owner_id)
    .maybeSingle()

  if (!ownerRaw) notFound()
  const owner = ownerRaw as Owner

  if (owner.username?.toLowerCase() !== username.toLowerCase()) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id ?? null
  const isOwner = userId === kit.owner_id

  if (kit.is_private && !isOwner) redirect('/feed')

  const { data: kitDogsRaw } = await admin
    .from('kit_dogs')
    .select('dog:dog_id(id, name, avatar)')
    .eq('kit_id', kitId)

  const taggedDogs = (kitDogsRaw ?? [])
    .map((r) => r.dog as TaggedDog | null)
    .filter((d): d is TaggedDog => d !== null)

  const { data: itemsRaw } = await admin
    .from('kit_items')
    .select('id, pack_id, item_type, position, note, added_at, product_id, place_id, post_id, product:product_id(id, name, brand, affiliate_url, category), place:place_id(id, name, address, city, state, category), post:post_id(id, images, body)')
    .eq('pack_id', kitId)
    .order('position', { ascending: true })

  const items = (itemsRaw ?? []) as unknown as KitItem[]

  return (
    <div className="min-h-svh bg-white">
      <div className="max-w-[640px] mx-auto">

        {/* Cover strip */}
        <div className="relative w-full overflow-hidden" style={{ height: 200, backgroundColor: '#0F2240' }}>
          {kit.cover_image && (
            <Image src={kit.cover_image} alt="" fill className="object-cover" />
          )}
          {/* Back nav */}
          <Link
            href={`/${username}`}
            className="absolute top-4 left-4 flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white transition-colors bg-black/25 backdrop-blur-sm px-3 py-1.5 rounded-full"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Back
          </Link>
          {/* Kit title overlaid at bottom */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-16 bg-gradient-to-t from-black/60 to-transparent">
            <h1 className="text-2xl font-bold text-white leading-tight">{kit.title}</h1>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pt-4 pb-24">

          {/* Type + privacy badges */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {kit.type && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#F7F3EE] text-[#0F2240]/70 capitalize">
                {kit.type.replace(/-/g, ' ')}
              </span>
            )}
            {kit.is_private && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#EDE3D6] text-[#0F2240]/60">
                Private
              </span>
            )}
          </div>

          {/* Description */}
          {kit.description && (
            <p className="text-sm text-[#0F2240]/70 leading-relaxed mb-4">{kit.description}</p>
          )}

          {/* Owner */}
          <div className="flex items-center gap-2.5 mb-4">
            <div className="relative w-7 h-7 rounded-full overflow-hidden bg-[#EDE3D6] shrink-0">
              {owner.avatar ? (
                <Image src={owner.avatar} alt={owner.display_name ?? ''} fill className="object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full text-xs font-bold text-[#0F2240]/40">
                  {(owner.display_name ?? owner.username ?? '?')[0].toUpperCase()}
                </div>
              )}
            </div>
            <Link
              href={`/${owner.username}`}
              className="text-sm text-[#0F2240]/60 hover:text-[#0F2240] transition-colors"
            >
              @{owner.username}
            </Link>
          </div>

          {/* Tagged dogs */}
          {taggedDogs.length > 0 && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {taggedDogs.map((dog) => (
                <Link
                  key={dog.id}
                  href={`/${username}/${slugify(dog.name)}`}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F7F3EE] hover:bg-[#EDE3D6] transition-colors"
                >
                  <div className="relative w-5 h-5 rounded-full overflow-hidden bg-[#EDE3D6] shrink-0">
                    {dog.avatar && (
                      <Image src={dog.avatar} alt={dog.name} fill className="object-cover" />
                    )}
                  </div>
                  <span className="text-xs font-medium text-[#0F2240]">{dog.name}</span>
                </Link>
              ))}
            </div>
          )}

          <div className="border-t border-[#0F2240]/8 mb-5" />

          {/* Items section */}
          <KitItemsSection
            kitId={kitId}
            isOwner={isOwner}
            initialItems={items}
            kitType={kit.type}
            userId={userId}
            isSystem={kit.is_system}
            kitTitle={kit.title}
          />

          {/* Delete kit */}
          {isOwner && (
            <div className="mt-12 pt-5 border-t border-[#0F2240]/8">
              <DeleteKitButton kitId={kitId} redirectTo={`/${username}`} />
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
