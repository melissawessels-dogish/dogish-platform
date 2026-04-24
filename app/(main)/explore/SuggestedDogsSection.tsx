'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { followDog, unfollowDog } from '@/app/actions/follow'

export type SuggestedDog = {
  id: string
  name: string
  avatar: string | null
  follower_count: number | null
  primary_breed: string | null
  owner_username: string | null
}

function DogCard({ dog, userId }: { dog: SuggestedDog; userId: string | null }) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    if (!userId || isPending) return
    const wasFollowing = isFollowing
    setIsFollowing(!wasFollowing)
    startTransition(async () => {
      try {
        if (wasFollowing) await unfollowDog(dog.id)
        else await followDog(dog.id)
      } catch {
        setIsFollowing(wasFollowing)
      }
    })
  }

  const href = dog.owner_username
    ? `/${dog.owner_username}/${dog.name.toLowerCase()}`
    : '/'

  return (
    <div className="w-36 shrink-0 flex flex-col rounded-2xl border border-[#0F2240]/8 bg-white px-3 pt-4 pb-3">
      <Link href={href} className="flex flex-col items-center gap-2 flex-1">
        <div className="relative w-14 h-14 rounded-full overflow-hidden bg-[#EDE3D6] shrink-0">
          {dog.avatar ? (
            <Image src={dog.avatar} alt={dog.name} fill className="object-cover" />
          ) : (
            <div className="flex items-center justify-center h-full text-base font-bold text-[#0F2240]/40">
              {dog.name[0].toUpperCase()}
            </div>
          )}
        </div>
        <div className="w-full text-center min-w-0">
          <p className="text-[13px] font-semibold text-[#0F2240] leading-tight truncate">{dog.name}</p>
          {dog.primary_breed && (
            <p className="text-[11px] text-[#0F2240]/45 leading-tight truncate mt-0.5">
              {dog.primary_breed}
            </p>
          )}
          {dog.owner_username && (
            <p className="text-[11px] text-[#0F2240]/30 leading-tight truncate mt-0.5">
              @{dog.owner_username}
            </p>
          )}
        </div>
      </Link>
      {userId && (
        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          className={`mt-3 w-full text-[12px] font-semibold py-1.5 rounded-full transition-colors disabled:opacity-50 ${
            isFollowing
              ? 'border border-[#0F2240]/25 text-[#0F2240] hover:bg-[#F7F3EE]'
              : 'bg-[#0F2240] text-white hover:bg-[#0F2240]/90'
          }`}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      )}
    </div>
  )
}

export default function SuggestedDogsSection({
  dogs,
  userId,
}: {
  dogs: SuggestedDog[]
  userId: string | null
}) {
  return (
    <div
      className="flex flex-nowrap gap-3 overflow-x-auto px-4 pb-3 [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: 'none' }}
    >
      {dogs.map((dog) => (
        <DogCard key={dog.id} dog={dog} userId={userId} />
      ))}
    </div>
  )
}
