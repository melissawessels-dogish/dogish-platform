'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'

export type KitItem = {
  id: string
  item_type: string
  position: number
  name: string | null
  brand: string | null
  url: string | null
  notes: string | null
  product_id: string | null
  place_id: string | null
  post_id: string | null
  product: { id: string; name: string; brand: string | null; affiliate_url: string | null } | null
  place: { id: string; name: string; address: string | null; city: string | null; state: string | null; category: string | null } | null
  post: { id: string; images: string[] | null; body: string | null } | null
}

type ProductResult = {
  id: string
  name: string
  brand: string | null
  affiliate_url: string | null
  category: string | null
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
  kitType: string | null
  userId: string | null
}

const PLACE_CATEGORIES = ['Park', 'Trail', 'Restaurant', 'Vet', 'Groomer', 'Hotel', 'Other']

export default function KitItemsSection({ kitId, isOwner, initialItems, userId }: Props) {
  const supabase = createClient()
  const [items, setItems] = useState<KitItem[]>(initialItems)
  const [showAddPanel, setShowAddPanel] = useState(false)

  // Product search
  const [productQuery, setProductQuery] = useState('')
  const [productResults, setProductResults] = useState<ProductResult[]>([])
  const [searchingProducts, setSearchingProducts] = useState(false)
  const [productSearchDone, setProductSearchDone] = useState(false)
  const [showNewProductForm, setShowNewProductForm] = useState(false)
  const [newProductName, setNewProductName] = useState('')
  const [newProductBrand, setNewProductBrand] = useState('')
  const [productAdded, setProductAdded] = useState(false)
  const [addingProduct, setAddingProduct] = useState(false)
  const [productError, setProductError] = useState<string | null>(null)

  // Place fields
  const [placeName, setPlaceName] = useState('')
  const [placeAddress, setPlaceAddress] = useState('')
  const [placeCity, setPlaceCity] = useState('')
  const [placeState, setPlaceState] = useState('')
  const [placeCategory, setPlaceCategory] = useState('')
  const [addingPlace, setAddingPlace] = useState(false)
  const [placeError, setPlaceError] = useState<string | null>(null)

  // Post search
  const [postQuery, setPostQuery] = useState('')
  const [postResults, setPostResults] = useState<PostResult[]>([])
  const [searching, setSearching] = useState(false)
  const [addingPost, setAddingPost] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)

  const searchProducts = useCallback(async (q: string) => {
    if (q.length < 2) { setProductResults([]); setProductSearchDone(false); return }
    setSearchingProducts(true)
    setProductSearchDone(false)
    const { data } = await supabase
      .from('product')
      .select('id, name, brand, affiliate_url, category')
      .or(`name.ilike.%${q}%,brand.ilike.%${q}%`)
      .limit(8)
    setProductResults(data ?? [])
    setSearchingProducts(false)
    setProductSearchDone(true)
  }, [supabase])

  useEffect(() => {
    const timer = setTimeout(() => searchProducts(productQuery), 300)
    return () => clearTimeout(timer)
  }, [productQuery, searchProducts])

  const searchPosts = useCallback(async (q: string) => {
    if (!userId) return
    if (q.length < 2) { setPostResults([]); return }
    setSearching(true)
    const { data } = await supabase
      .from('post')
      .select('id, body, images')
      .eq('author_id', userId)
      .ilike('body', `%${q}%`)
      .limit(6)
    setPostResults(data ?? [])
    setSearching(false)
  }, [supabase, userId])

  useEffect(() => {
    const timer = setTimeout(() => searchPosts(postQuery), 300)
    return () => clearTimeout(timer)
  }, [postQuery, searchPosts])

  const nextPosition = items.length > 0 ? Math.max(...items.map((i) => i.position)) + 1 : 0

  const closePanel = () => {
    setShowAddPanel(false)
    setProductQuery(''); setProductResults([]); setProductSearchDone(false)
    setShowNewProductForm(false); setNewProductName(''); setNewProductBrand(''); setProductAdded(false); setProductError(null)
    setPlaceName(''); setPlaceAddress(''); setPlaceCity(''); setPlaceState(''); setPlaceCategory(''); setPlaceError(null)
    setPostQuery(''); setPostResults([]); setPostError(null)
  }

  const addExistingProduct = async (product: ProductResult) => {
    if (items.some((i) => i.product_id === product.id)) return
    setAddingProduct(true)
    setProductError(null)
    try {
      const { data: item, error: itemErr } = await supabase
        .from('kit_items')
        .insert({
          pack_id: kitId,
          item_type: 'product',
          product_id: product.id,
          position: nextPosition,
        })
        .select('id, pack_id, item_type, product_id, place_id, post_id, note, position, added_at')
        .single()
      if (itemErr) throw itemErr
      setItems((prev) => [...prev, { ...item, product, place: null, post: null }])
      closePanel()
    } catch (err) {
      setProductError(err instanceof Error ? err.message : 'Failed to add product')
    } finally {
      setAddingProduct(false)
    }
  }

  const addNewProduct = async () => {
    const name = newProductName.trim()
    if (!name) return
    setAddingProduct(true)
    setProductError(null)
    try {
      // Duplicate check
      const { data: existing } = await supabase
        .from('product')
        .select('id, name, brand, affiliate_url, category')
        .ilike('name', name)
        .limit(1)
        .maybeSingle()

      if (existing) {
        setProductResults([existing])
        setShowNewProductForm(false); setProductAdded(false)
        setProductError(null)
        setAddingProduct(false)
        return
      }

      const { data: product, error: prodErr } = await supabase
        .from('product')
        .insert({
          name,
          brand: newProductBrand.trim() || null,
          source: 'community',
          submitted_by: userId,
          affiliate_url: null,
        })
        .select('id, name, brand, affiliate_url, category')
        .single()
      if (prodErr) { console.error('[product insert error]', prodErr); throw prodErr }

      const { data: item, error: itemErr } = await supabase
        .from('kit_items')
        .insert({
          pack_id: kitId,
          item_type: 'product',
          product_id: product.id,
          position: nextPosition,
        })
        .select('id, pack_id, item_type, product_id, place_id, post_id, note, position, added_at')
        .single()
      if (itemErr) throw itemErr

      setProductAdded(true)
      setItems((prev) => [...prev, { ...item, product, place: null, post: null }])
      closePanel()
    } catch (err) {
      setProductError(err instanceof Error ? err.message : 'Failed to add product')
    } finally {
      setAddingProduct(false)
    }
  }

  const addPlace = async () => {
    const name = placeName.trim()
    const city = placeCity.trim()
    const state = placeState.trim()
    if (!name || !city || !state) return
    setAddingPlace(true)
    setPlaceError(null)
    try {
      const { data: place, error: placeErr } = await supabase
        .from('place')
        .insert({
          name,
          address: placeAddress.trim() || null,
          city,
          state,
          category: placeCategory || null,
        })
        .select('id, name, address, city, state, category')
        .single()
      if (placeErr) throw placeErr

      const { data: item, error: itemErr } = await supabase
        .from('kit_items')
        .insert({
          pack_id: kitId,
          item_type: 'place',
          place_id: place.id,
          position: nextPosition,
        })
        .select('id, pack_id, item_type, product_id, place_id, post_id, note, position, added_at')
        .single()
      if (itemErr) throw itemErr

      setItems((prev) => [...prev, { ...item, product: null, place, post: null }])
      closePanel()
    } catch (err) {
      setPlaceError(err instanceof Error ? err.message : 'Failed to add place')
    } finally {
      setAddingPlace(false)
    }
  }

  const addPost = async (post: PostResult) => {
    if (items.some((i) => i.post_id === post.id)) return
    setAddingPost(true)
    setPostError(null)
    try {
      const { data: item, error: itemErr } = await supabase
        .from('kit_items')
        .insert({
          pack_id: kitId,
          item_type: 'post',
          post_id: post.id,
          position: nextPosition,
        })
        .select('id, pack_id, item_type, product_id, place_id, post_id, note, position, added_at')
        .single()
      if (itemErr) throw itemErr

      setItems((prev) => [...prev, { ...item, product: null, place: null, post: { id: post.id, images: post.images, body: post.body } }])
      closePanel()
    } catch (err) {
      setPostError(err instanceof Error ? err.message : 'Failed to add post')
    } finally {
      setAddingPost(false)
    }
  }

  const removeItem = async (id: string) => {
    const { error } = await supabase.from('kit_items').delete().eq('id', id)
    if (!error) setItems((prev) => prev.filter((i) => i.id !== id))
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#0F2240]/50">
          <span className="font-semibold text-[#0F2240]">{items.length}</span>{' '}
          {items.length === 1 ? 'item' : 'items'}
        </p>
        {isOwner && (
          <button
            type="button"
            onClick={() => { setShowAddPanel((v) => !v); if (showAddPanel) closePanel() }}
            className="text-sm font-medium px-4 py-1.5 rounded-full border border-[#0F2240]/20 text-[#0F2240] hover:bg-[#F7F3EE] transition-colors"
          >
            {showAddPanel ? 'Cancel' : '+ Add item'}
          </button>
        )}
      </div>

      {/* Add panel */}
      {showAddPanel && isOwner && (
        <div className="mb-5 rounded-xl border border-[#0F2240]/10 overflow-hidden bg-[#F7F3EE]">
          <div className="p-4 space-y-0">

            {/* SECTION 1: Add a product */}
            <div className="pb-5">
              <p className="text-sm font-semibold text-[#0F2240] mb-0.5">Add a product</p>
              <p className="text-xs text-[#0F2240]/45 mb-3">Search for a product to add to this kit</p>

              {!showNewProductForm ? (
                <>
                  <Input
                    placeholder="Search products…"
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] bg-white text-[#0F2240] mb-2"
                  />
                  {productQuery.length < 2 ? null : searchingProducts ? (
                    <p className="text-xs text-[#0F2240]/40 py-1">Searching…</p>
                  ) : productResults.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {productResults.map((product) => {
                        const alreadyAdded = items.some((i) => i.product_id === product.id)
                        return (
                          <button
                            key={product.id}
                            type="button"
                            disabled={alreadyAdded || addingProduct}
                            onClick={() => addExistingProduct(product)}
                            className="flex items-center gap-3 p-2.5 rounded-lg bg-white border border-[#0F2240]/10 hover:border-[#0F2240]/30 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#0F2240] truncate">{product.name}</p>
                              {(product.brand || product.category) && (
                                <p className="text-xs text-[#0F2240]/50 truncate">
                                  {[product.brand, product.category].filter(Boolean).join(' · ')}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-[#0F2240]/40 shrink-0">
                              {alreadyAdded ? 'Added' : '+ Add'}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  ) : productSearchDone ? (
                    <div>
                      <p className="text-xs text-[#0F2240]/30 py-1">No products found.</p>
                      <button
                        type="button"
                        onClick={() => { setShowNewProductForm(true); setProductAdded(false) }}
                        className="text-xs font-medium text-[#0F2240]/60 hover:text-[#0F2240] underline underline-offset-2 transition-colors"
                      >
                        Don&apos;t see it? Add it to the catalog
                      </button>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => { setShowNewProductForm(false); setProductAdded(false); setProductError(null) }}
                    className="text-xs text-[#0F2240]/50 hover:text-[#0F2240] transition-colors"
                  >
                    ← Back to search
                  </button>
                  <Input
                    placeholder="Product name *"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] bg-white text-[#0F2240]"
                  />
                  <Input
                    placeholder="Brand *"
                    value={newProductBrand}
                    onChange={(e) => setNewProductBrand(e.target.value)}
                    className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] bg-white text-[#0F2240]"
                  />
                  <button
                    type="button"
                    disabled={!newProductName.trim() || !newProductBrand.trim() || addingProduct}
                    onClick={addNewProduct}
                    className="w-full py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40 transition-opacity"
                    style={{ backgroundColor: '#0F2240' }}
                  >
                    {addingProduct ? 'Adding…' : 'Add to kit and Dogish catalog'}
                  </button>
                  {productAdded && (
                    <p className="text-xs text-[#0F2240]/40 text-center">Added to your kit and the Dogish product catalog</p>
                  )}
                </div>
              )}

              {productError && <p className="text-xs text-red-600 mt-2">{productError}</p>}
            </div>

            <div className="border-t border-[#0F2240]/10" />

            {/* SECTION 2: Add a place */}
            <div className="py-5">
              <p className="text-sm font-semibold text-[#0F2240] mb-0.5">Add a place</p>
              <p className="text-xs text-[#0F2240]/45 mb-3">Add a location you recommend</p>
              <div className="space-y-2">
                <Input
                  placeholder="Place name *"
                  value={placeName}
                  onChange={(e) => setPlaceName(e.target.value)}
                  className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] bg-white text-[#0F2240]"
                />
                <Input
                  placeholder="Address (optional)"
                  value={placeAddress}
                  onChange={(e) => setPlaceAddress(e.target.value)}
                  className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] bg-white text-[#0F2240]"
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="City *"
                    value={placeCity}
                    onChange={(e) => setPlaceCity(e.target.value)}
                    className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] bg-white text-[#0F2240]"
                  />
                  <Input
                    placeholder="State *"
                    value={placeState}
                    onChange={(e) => setPlaceState(e.target.value)}
                    className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] bg-white text-[#0F2240] w-24 shrink-0"
                  />
                </div>
                <select
                  value={placeCategory}
                  onChange={(e) => setPlaceCategory(e.target.value)}
                  className="w-full h-9 rounded-md border border-[#0F2240]/20 bg-white px-3 text-sm text-[#0F2240] focus:outline-none focus:ring-2 focus:ring-[#0F2240]"
                >
                  <option value="">Category (optional)</option>
                  {PLACE_CATEGORIES.map((c) => (
                    <option key={c} value={c.toLowerCase()}>{c}</option>
                  ))}
                </select>
                {placeError && <p className="text-xs text-red-600">{placeError}</p>}
                <button
                  type="button"
                  disabled={!placeName.trim() || !placeCity.trim() || !placeState.trim() || addingPlace}
                  onClick={addPlace}
                  className="w-full py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40 transition-opacity"
                  style={{ backgroundColor: '#0F2240' }}
                >
                  {addingPlace ? 'Adding…' : 'Add place'}
                </button>
              </div>
            </div>

            <div className="border-t border-[#0F2240]/10" />

            {/* SECTION 3: From your posts */}
            <div className="pt-5">
              <p className="text-sm font-semibold text-[#0F2240] mb-0.5">From your posts</p>
              <p className="text-xs text-[#0F2240]/45 mb-3">Link a post you&apos;ve already shared</p>
              <Input
                placeholder="Search your posts…"
                value={postQuery}
                onChange={(e) => setPostQuery(e.target.value)}
                className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] bg-white text-[#0F2240] mb-2"
              />
              {postQuery.length < 2 ? (
                <p className="text-xs text-[#0F2240]/30 py-1">Type to search your posts…</p>
              ) : searching ? (
                <p className="text-xs text-[#0F2240]/40 py-1">Searching…</p>
              ) : postResults.length === 0 ? (
                <p className="text-xs text-[#0F2240]/30 py-1">No posts found.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {postResults.map((post) => {
                    const alreadyAdded = items.some((i) => i.post_id === post.id)
                    return (
                      <button
                        key={post.id}
                        type="button"
                        disabled={alreadyAdded || addingPost}
                        onClick={() => addPost(post)}
                        className="flex items-center gap-3 p-2 rounded-lg bg-white border border-[#0F2240]/10 hover:border-[#0F2240]/30 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="relative w-10 shrink-0 rounded-md overflow-hidden bg-[#EDE3D6]" style={{ aspectRatio: '4/5' }}>
                          {post.images?.[0] && (
                            <Image src={post.images[0]} alt="" fill className="object-cover" />
                          )}
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
              {postError && <p className="text-xs text-red-600 mt-2">{postError}</p>}
            </div>

          </div>
        </div>
      )}

      {/* Items list */}
      {items.length > 0 ? (
        <div className="flex flex-col gap-3">
          {items.map((item) => {
            const isPost = item.item_type === 'post'
            const isPlace = item.item_type === 'place'

            const displayName = isPost
              ? (item.post?.body || '(no caption)')
              : isPlace
              ? (item.place?.name ?? item.name ?? '')
              : (item.product?.name ?? item.name ?? '')

            const displaySub = isPlace
              ? ([item.place?.city, item.place?.state].filter(Boolean).join(', ') || null)
              : (item.product?.brand ?? item.brand ?? null)

            const displayUrl = !isPost && !isPlace ? (item.product?.affiliate_url ?? item.url ?? null) : null

            return (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-[#0F2240]/10 bg-white group"
              >
                {/* Visual */}
                {isPost ? (
                  <Link href={`/posts/${item.post_id}`} className="shrink-0">
                    <div className="relative w-12 rounded-lg overflow-hidden bg-[#EDE3D6]" style={{ aspectRatio: '4/5' }}>
                      {item.post?.images?.[0] && (
                        <Image src={item.post.images[0]} alt="" fill className="object-cover" />
                      )}
                    </div>
                  </Link>
                ) : isPlace ? (
                  <div className="w-10 h-10 rounded-lg bg-[#EDE3D6] flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F2240" strokeWidth="1.5" opacity="0.4">
                      <path d="M20 10c0 6-8 13-8 13s-8-7-8-13a8 8 0 0 1 16 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-[#EDE3D6] flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F2240" strokeWidth="1.5" opacity="0.4">
                      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <path d="M16 10a4 4 0 01-8 0" />
                    </svg>
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {isPost ? (
                    <Link href={`/posts/${item.post_id}`} className="block">
                      <p className="text-sm text-[#0F2240] line-clamp-2 leading-snug">{displayName}</p>
                    </Link>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-[#0F2240] truncate">{displayName}</p>
                      {displaySub && (
                        <p className="text-xs text-[#0F2240]/50 mt-0.5">{displaySub}</p>
                      )}
                      {displayUrl && (
                        <a
                          href={displayUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#0F2240]/40 hover:text-[#0F2240] underline underline-offset-2 mt-0.5 block truncate"
                        >
                          {displayUrl.replace(/^https?:\/\//, '')}
                        </a>
                      )}
                    </>
                  )}
                </div>

                {/* Category tag */}
                {!isPost && (
                  <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F7F3EE] text-[#0F2240]/60 capitalize">
                    {isPlace
                      ? (item.place?.category ?? 'place')
                      : 'product'}
                  </span>
                )}

                {/* Remove (owner) */}
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-[#0F2240]/30 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Remove item"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 2l8 8M10 2l-8 8" />
                    </svg>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="text-sm text-[#0F2240]/40">
            {isOwner ? 'Add your first item.' : 'This kit is empty.'}
          </p>
        </div>
      )}
    </div>
  )
}
