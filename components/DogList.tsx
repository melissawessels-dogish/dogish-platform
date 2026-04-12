'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { deleteDog } from '@/app/actions/dogs'

type Dog = {
  id: string
  name: string
  avatar: string | null
}

export default function DogList({ dogs }: { dogs: Dog[] }) {
  const [list, setList] = useState(dogs)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleRemove = (dogId: string) => {
    startTransition(async () => {
      const result = await deleteDog(dogId)
      if (!result.error) {
        setList((prev) => prev.filter((d) => d.id !== dogId))
      }
      setConfirmId(null)
    })
  }

  return (
    <div className="flex flex-row gap-4 flex-wrap">
      {list.map((dog) => (
        <div key={dog.id} className="flex flex-col items-center gap-1.5" style={{ width: 96 }}>
          {/* Circle */}
          <div className="relative w-24 h-24 rounded-full overflow-hidden bg-[#EDE3D6] shrink-0">
            {dog.avatar ? (
              <Image src={dog.avatar} alt={dog.name} fill className="object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full text-2xl font-bold text-[#0F2240]/40">
                {dog.name[0].toUpperCase()}
              </div>
            )}
          </div>

          {/* Name */}
          <span className="text-[13px] font-medium text-[#0F2240] text-center leading-tight w-full truncate text-center">
            {dog.name}
          </span>

          {/* Actions */}
          {confirmId === dog.id ? (
            <div className="flex flex-col items-center gap-1">
              <span className="text-[11px] text-[#0F2240]/60">Remove?</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRemove(dog.id)}
                  disabled={isPending}
                  className="text-[11px] font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  Remove
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmId(null)}
                  disabled={isPending}
                  className="text-[11px] text-[#0F2240]/50 hover:text-[#0F2240]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href={`/dogs/${dog.id}/edit`}
                className="text-[11px] text-[#0F2240]/50 hover:text-[#0F2240] transition-colors"
              >
                Edit
              </Link>
              <button
                type="button"
                onClick={() => setConfirmId(dog.id)}
                className="text-[11px] text-[#0F2240]/50 hover:text-red-600 transition-colors"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Add a dog */}
      <div className="flex flex-col items-center gap-1.5" style={{ width: 96 }}>
        <Link
          href="/dogs/new"
          className="w-24 h-24 rounded-full border-2 border-dashed border-[#0F2240]/20 hover:border-[#0F2240]/50 bg-[#F7F3EE] flex items-center justify-center transition-colors group"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#0F2240]/30 group-hover:text-[#0F2240]/60 transition-colors">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </Link>
        <span className="text-[13px] text-[#0F2240]/40 text-center leading-tight">
          Add a dog
        </span>
      </div>
    </div>
  )
}
