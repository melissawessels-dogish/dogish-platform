'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import PlacePicker from '@/components/ui/PlacePicker'

type FavPlace = {
  id: string
  place: { id: string; name: string; city: string | null; state: string | null } | null
}

type Props = {
  kitId: string
  initialItems: FavPlace[]
  isOwner: boolean
}

export default function FavoritePlacesSection({ kitId, initialItems, isOwner }: Props) {
  const [items, setItems] = useState<FavPlace[]>(initialItems)
  const supabase = createClient()

  const handleAdd = async (place: { id: string; name: string; city: string; state: string }) => {
    const { data: item, error } = await supabase
      .from('kit_items')
      .insert({
        pack_id: kitId,
        item_type: 'place',
        place_id: place.id,
        position: items.length,
      })
      .select('id, place:place_id(id, name, city, state)')
      .single()

    if (!error && item) {
      setItems((prev) => [item as FavPlace, ...prev])
    }
  }

  const handleRemove = async (itemId: string) => {
    const { error } = await supabase.from('kit_items').delete().eq('id', itemId)
    if (!error) {
      setItems((prev) => prev.filter((i) => i.id !== itemId))
    }
  }

  return (
    <div className="px-4 py-5">
      <h2 className="text-base font-bold text-[#0F2240] mb-4">Favorite Places</h2>

      {isOwner && (
        <div className="mb-4">
          <PlacePicker onPlaceSelect={handleAdd} placeholder="Add a place…" />
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-[#0F2240]/40 py-2 text-center">No favorite places yet.</p>
      ) : (
        <div className="divide-y divide-[#0F2240]/6">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-2.5 gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#0F2240] truncate">{item.place?.name}</p>
                {(item.place?.city || item.place?.state) && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {[item.place?.city, item.place?.state].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  className="shrink-0 text-[#0F2240]/30 hover:text-[#0F2240]/60 transition-colors"
                  aria-label="Remove place"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
