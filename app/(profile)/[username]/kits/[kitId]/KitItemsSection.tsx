'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

const ITEM_TYPES = [
  { value: 'food', label: 'Food' },
  { value: 'treat', label: 'Treat' },
  { value: 'toy', label: 'Toy' },
  { value: 'gear', label: 'Gear' },
  { value: 'health', label: 'Health' },
  { value: 'grooming', label: 'Grooming' },
  { value: 'other', label: 'Other' },
] as const

type ItemTypeValue = typeof ITEM_TYPES[number]['value']

export type KitItem = {
  id: string
  item_type: string
  name: string
  brand: string | null
  url: string | null
  notes: string | null
  position: number
  post_id: string | null
  post: {
    id: string
    images: string[] | null
    body: string | null
  } | null
}

type PostResult = {
  id: string
  body: string | null
  images: string[] | null
}

type Props = {
  kitId: string
  isOwner: boolean
  initialItems: KitItem[]
}

export default function KitItemsSection({ kitId, isOwner, initialItems }: Props) {
  const supabase = createClient()
  const [items, setItems] = useState<KitItem[]>(initialItems)
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [tab, setTab] = useState<'search' | 'manual'>('search')

  // Post search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PostResult[]>([])
  const [searching, setSearching] = useState(false)

  // Manual item state
  const [manualType, setManualType] = useState<ItemTypeValue>('other')
  const [manualName, setManualName] = useState('')
  const [manualBrand, setManualBrand] = useState('')
  const [manualUrl, setManualUrl] = useState('')
  const [manualNotes, setManualNotes] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const searchPosts = useCallback(async (q: string) => {
    if (q.length < 2) { setSearchResults([]); return }
    setSearching(true)
    const { data } = await supabase
      .from('post')
      .select('id, body, images')
      .ilike('body', `%${q}%`)
      .eq('is_private', false)
      .limit(8)
    setSearchResults(data ?? [])
    setSearching(false)
  }, [supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setTimeout(() => searchPosts(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery, searchPosts])

  const nextPosition = items.length > 0 ? Math.max(...items.map((i) => i.position)) + 1 : 0

  const addPost = async (post: PostResult) => {
    if (items.some((i) => i.post_id === post.id)) return
    setAdding(true)
    setAddError(null)
    try {
      const { data, error } = await supabase
        .from('kit_items')
        .insert({
          kit_id: kitId,
          item_type: 'other',
          name: post.body?.slice(0, 100) || 'Post',
          post_id: post.id,
          position: nextPosition,
        })
        .select('id, item_type, name, brand, url, notes, position, post_id')
        .single()
      if (error) throw error
      setItems((prev) => [...prev, { ...data, post: { id: post.id, images: post.images, body: post.body } }])
      setSearchQuery('')
      setSearchResults([])
      setShowAddPanel(false)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add item')
    } finally {
      setAdding(false)
    }
  }

  const addManualItem = async () => {
    if (!manualName.trim()) return
    setAdding(true)
    setAddError(null)
    try {
      const { data, error } = await supabase
        .from('kit_items')
        .insert({
          kit_id: kitId,
          item_type: manualType,
          name: manualName.trim(),
          brand: manualBrand.trim() || null,
          url: manualUrl.trim() || null,
          notes: manualNotes.trim() || null,
          position: nextPosition,
        })
        .select('id, item_type, name, brand, url, notes, position, post_id')
        .single()
      if (error) throw error
      setItems((prev) => [...prev, { ...data, post: null }])
      setManualName('')
      setManualBrand('')
      setManualUrl('')
      setManualNotes('')
      setManualType('other')
      setShowAddPanel(false)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add item')
    } finally {
      setAdding(false)
    }
  }

  const removeItem = async (id: string) => {
    const { error } = await supabase.from('kit_items').delete().eq('id', id)
    if (!error) setItems((prev) => prev.filter((i) => i.id !== id))
  }

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#0F2240]/50">
          <span className="font-semibold text-[#0F2240]">{items.length}</span>{' '}
          {items.length === 1 ? 'item' : 'items'}
        </p>
        {isOwner && (
          <button
            type="button"
            onClick={() => { setShowAddPanel((v) => !v); setAddError(null) }}
            className="text-sm font-medium px-4 py-1.5 rounded-full border border-[#0F2240]/20 text-[#0F2240] hover:bg-[#F7F3EE] transition-colors"
          >
            {showAddPanel ? 'Cancel' : '+ Add item'}
          </button>
        )}
      </div>

      {/* Add panel */}
      {showAddPanel && isOwner && (
        <div className="mb-5 rounded-xl border border-[#0F2240]/10 bg-[#F7F3EE] overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-[#0F2240]/10">
            {(['search', 'manual'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  tab === t
                    ? 'bg-white text-[#0F2240] border-b-2 border-[#0F2240]'
                    : 'text-[#0F2240]/50 hover:text-[#0F2240]'
                }`}
              >
                {t === 'search' ? 'Search posts' : 'Add manually'}
              </button>
            ))}
          </div>

          <div className="p-4">
            {tab === 'search' && (
              <div className="space-y-3">
                <Input
                  placeholder="Search posts by text…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] bg-white text-[#0F2240]"
                  autoFocus
                />
                {searching && (
                  <p className="text-xs text-[#0F2240]/40 text-center py-2">Searching…</p>
                )}
                {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                  <p className="text-xs text-[#0F2240]/40 text-center py-2">No posts found.</p>
                )}
                {searchResults.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {searchResults.map((post) => {
                      const alreadyAdded = items.some((i) => i.post_id === post.id)
                      const img = post.images?.[0]
                      return (
                        <button
                          key={post.id}
                          type="button"
                          disabled={alreadyAdded || adding}
                          onClick={() => addPost(post)}
                          className="flex items-center gap-3 p-2 rounded-lg bg-white border border-[#0F2240]/10 hover:border-[#0F2240]/30 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="relative w-10 h-10 rounded-md overflow-hidden bg-[#EDE3D6] shrink-0">
                            {img && <Image src={img} alt="" fill className="object-cover" />}
                          </div>
                          <p className="text-sm text-[#0F2240] line-clamp-2 flex-1">
                            {post.body || '(no caption)'}
                          </p>
                          {alreadyAdded && (
                            <span className="text-xs text-[#0F2240]/40 shrink-0">Added</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {tab === 'manual' && (
              <div className="space-y-3">
                {/* Item type */}
                <div className="space-y-1.5">
                  <Label className="text-[#0F2240] font-medium text-xs">Type</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {ITEM_TYPES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setManualType(t.value)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          manualType === t.value
                            ? 'bg-[#0F2240] text-white'
                            : 'bg-white text-[#0F2240] border border-[#0F2240]/15 hover:border-[#0F2240]/40'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[#0F2240] font-medium text-xs">
                    Name <span className="text-[#C4855A]">*</span>
                  </Label>
                  <Input
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="Product or place name"
                    className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] bg-white text-[#0F2240]"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-[#0F2240] font-medium text-xs">Brand</Label>
                    <Input
                      value={manualBrand}
                      onChange={(e) => setManualBrand(e.target.value)}
                      placeholder="Optional"
                      className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] bg-white text-[#0F2240]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[#0F2240] font-medium text-xs">URL</Label>
                    <Input
                      value={manualUrl}
                      onChange={(e) => setManualUrl(e.target.value)}
                      placeholder="Optional"
                      type="url"
                      className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] bg-white text-[#0F2240]"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[#0F2240] font-medium text-xs">Notes</Label>
                  <Input
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                    placeholder="Optional"
                    className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] bg-white text-[#0F2240]"
                  />
                </div>
                <Button
                  type="button"
                  disabled={!manualName.trim() || adding}
                  onClick={addManualItem}
                  style={{ backgroundColor: '#0F2240' }}
                  className="w-full text-white disabled:opacity-40"
                >
                  {adding ? 'Adding…' : 'Add item'}
                </Button>
              </div>
            )}

            {addError && (
              <p className="mt-2 text-xs text-red-600">{addError}</p>
            )}
          </div>
        </div>
      )}

      {/* Items list */}
      {items.length > 0 ? (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-[#0F2240]/10 bg-white group"
            >
              {/* Thumbnail (post) or type badge (manual) */}
              {item.post_id && item.post ? (
                <Link href={`/posts/${item.post_id}`} className="shrink-0">
                  <div className="relative w-14 rounded-lg overflow-hidden bg-[#EDE3D6]" style={{ aspectRatio: '4/5' }}>
                    {item.post.images?.[0] && (
                      <Image
                        src={item.post.images[0]}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                </Link>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-[#EDE3D6] flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-semibold text-[#0F2240]/50 uppercase">
                    {item.item_type.slice(0, 3)}
                  </span>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                {item.post_id && item.post ? (
                  <Link href={`/posts/${item.post_id}`} className="block">
                    <p className="text-sm text-[#0F2240] line-clamp-2 leading-snug">
                      {item.post.body || '(no caption)'}
                    </p>
                  </Link>
                ) : (
                  <>
                    <p className="text-sm font-medium text-[#0F2240] truncate">{item.name}</p>
                    {item.brand && (
                      <p className="text-xs text-[#0F2240]/50 mt-0.5">{item.brand}</p>
                    )}
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#0F2240]/40 hover:text-[#0F2240] underline underline-offset-2 mt-0.5 block truncate"
                      >
                        {item.url.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                    {item.notes && (
                      <p className="text-xs text-[#0F2240]/40 mt-0.5 truncate">{item.notes}</p>
                    )}
                  </>
                )}
              </div>

              {/* Item type badge (manual only) */}
              {!item.post_id && (
                <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F7F3EE] text-[#0F2240]/60 capitalize">
                  {item.item_type}
                </span>
              )}

              {/* Remove button (owner) */}
              {isOwner && (
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-[#0F2240]/30 hover:text-[#0F2240] hover:bg-[#F7F3EE] transition-colors opacity-0 group-hover:opacity-100"
                  aria-label="Remove item"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 2l8 8M10 2l-8 8" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="text-sm text-[#0F2240]/40">
            {isOwner ? 'No items yet. Add your first item.' : 'This kit is empty.'}
          </p>
        </div>
      )}
    </div>
  )
}
