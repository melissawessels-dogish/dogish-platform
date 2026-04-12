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
    <div className="flex flex-col gap-1">
      {list.map((dog) => (
        <div key={dog.id} className="flex items-center gap-3 py-2">
          {/* Avatar */}
          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[#EDE3D6] shrink-0">
            {dog.avatar ? (
              <Image src={dog.avatar} alt={dog.name} fill className="object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full text-sm font-bold text-[#0F2240]/40">
                {dog.name[0].toUpperCase()}
              </div>
            )}
          </div>

          {/* Name */}
          <span className="flex-1 text-[14px] font-medium text-[#0F2240] truncate">
            {dog.name}
          </span>

          {/* Actions */}
          {confirmId === dog.id ? (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[12px] text-[#0F2240]/60">Remove?</span>
              <button
                type="button"
                onClick={() => handleRemove(dog.id)}
                disabled={isPending}
                className="text-[12px] font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                Remove
              </button>
              <button
                type="button"
                onClick={() => setConfirmId(null)}
                disabled={isPending}
                className="text-[12px] text-[#0F2240]/50 hover:text-[#0F2240]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href={`/dogs/${dog.id}/edit`}
                className="text-[12px] text-[#0F2240]/50 hover:text-[#0F2240] transition-colors"
              >
                Edit
              </Link>
              <button
                type="button"
                onClick={() => setConfirmId(dog.id)}
                className="text-[12px] text-[#0F2240]/50 hover:text-red-600 transition-colors"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      ))}

      <Link
        href="/dogs/new"
        className="inline-flex items-center gap-1.5 mt-2 text-[13px] text-[#0F2240]/50 hover:text-[#0F2240] transition-colors"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add a dog
      </Link>
    </div>
  )
}
