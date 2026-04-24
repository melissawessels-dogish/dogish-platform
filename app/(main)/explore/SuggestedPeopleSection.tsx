'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { followHuman, unfollowHuman } from '@/app/actions/follow'

export type SuggestedPerson = {
  id: string
  display_name: string | null
  username: string | null
  avatar: string | null
  follower_count: number | null
}

function PersonCard({ person, userId }: { person: SuggestedPerson; userId: string | null }) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    if (!userId || isPending) return
    const wasFollowing = isFollowing
    setIsFollowing(!wasFollowing)
    startTransition(async () => {
      try {
        if (wasFollowing) await unfollowHuman(person.id, person.username ?? '')
        else await followHuman(person.id, person.username ?? '')
      } catch {
        setIsFollowing(wasFollowing)
      }
    })
  }

  const href = person.username ? `/${person.username}` : '/'

  return (
    <div className="w-36 shrink-0 flex flex-col rounded-2xl border border-[#0F2240]/8 bg-white px-3 pt-4 pb-3">
      <Link href={href} className="flex flex-col items-center gap-2 flex-1">
        <div className="relative w-14 h-14 rounded-full overflow-hidden bg-[#EDE3D6] shrink-0">
          {person.avatar ? (
            <Image src={person.avatar} alt={person.display_name ?? ''} fill className="object-cover" />
          ) : (
            <div className="flex items-center justify-center h-full text-base font-bold text-[#0F2240]/40">
              {(person.display_name ?? person.username ?? '?')[0].toUpperCase()}
            </div>
          )}
        </div>
        <div className="w-full text-center min-w-0">
          <p className="text-[13px] font-semibold text-[#0F2240] leading-tight truncate">
            {person.display_name ?? person.username}
          </p>
          {person.username && (
            <p className="text-[11px] text-[#0F2240]/45 leading-tight truncate mt-0.5">
              @{person.username}
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

export default function SuggestedPeopleSection({
  people,
  userId,
}: {
  people: SuggestedPerson[]
  userId: string | null
}) {
  return (
    <div
      className="flex flex-nowrap gap-3 overflow-x-auto px-4 pb-3 [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: 'none' }}
    >
      {people.map((person) => (
        <PersonCard key={person.id} person={person} userId={userId} />
      ))}
    </div>
  )
}
