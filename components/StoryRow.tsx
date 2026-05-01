'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import StoryViewer, { type Story } from './StoryViewer'
import { createStory } from '@/app/actions/stories'

type StoryAuthor = {
  id: string
  username: string | null
  display_name: string | null
  avatar: string | null
}

export type StoryGroup = {
  author: StoryAuthor
  stories: Story[]
  hasUnseen: boolean
  isOwn: boolean
  hasDog?: boolean
}

type Props = {
  groups: StoryGroup[]
  currentUserId: string
  currentUserAvatar: string | null
  currentUserDogId?: string | null
}

export default function StoryRow({ groups, currentUserId, currentUserAvatar, currentUserDogId }: Props) {
  const [viewingGroup, setViewingGroup] = useState<StoryGroup | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const ownGroup = groups.find((g) => g.isOwn) ?? null
  const otherGroups = groups.filter((g) => !g.isOwn)
  const orderedGroups = [
    ...otherGroups.filter((g) => g.hasUnseen),
    ...otherGroups.filter((g) => !g.hasUnseen),
  ]

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (currentUserDogId) fd.append('dog_id', currentUserDogId)
      await createStory(fd)
    } catch (err) {
      console.error('Story upload failed', err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <>
      <div className="flex gap-3 px-3 py-3 overflow-x-auto scrollbar-hide border-b border-[#F0F0F0]">

        {/* Own avatar / add story */}
        <button
          onClick={() => {
            if (ownGroup && ownGroup.stories.length > 0) {
              setViewingGroup(ownGroup)
            } else {
              fileInputRef.current?.click()
            }
          }}
          disabled={uploading}
          className="flex flex-col items-center gap-1.5 shrink-0"
        >
          <div className="relative">
            <div className={`w-[58px] h-[58px] rounded-full overflow-hidden bg-[#EDE3D6] ${ownGroup?.hasUnseen ? 'ring-2 ring-[#0F2240] ring-offset-1' : ''}`}>
              {currentUserAvatar ? (
                <Image src={currentUserAvatar} alt="You" width={58} height={58} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#0F2240]/30">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                </div>
              )}
            </div>
            {(!ownGroup || ownGroup.stories.length === 0) && (
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#0F2240] rounded-full flex items-center justify-center border-2 border-white">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
            )}
          </div>
          <span className="text-[10px] text-[#0F2240]/50 leading-none">
            {uploading ? '…' : 'Your story'}
          </span>
        </button>

        {/* Other users' stories */}
        {orderedGroups.map((group) => (
          <button
            key={group.author.id}
            onClick={() => setViewingGroup(group)}
            className="flex flex-col items-center gap-1.5 shrink-0"
          >
            <div className={`w-[58px] h-[58px] rounded-full overflow-hidden bg-[#EDE3D6] p-[2px] ${
              group.hasUnseen
                ? 'bg-gradient-to-tr from-[#0F2240] to-[#8BA0B8]'
                : 'bg-[#0F2240]/15'
            }`}>
              <div className="w-full h-full rounded-full overflow-hidden bg-white p-[2px]">
                <div className="w-full h-full rounded-full overflow-hidden bg-[#EDE3D6]">
                  {group.author.avatar ? (
                    <Image src={group.author.avatar} alt={group.author.display_name ?? ''} width={54} height={54} className="object-cover w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#0F2240]/40 text-sm font-bold">
                      {(group.author.display_name ?? group.author.username ?? '?')[0].toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <span className="text-[10px] text-[#0F2240]/50 leading-none max-w-[58px] truncate">
              {group.author.display_name ?? group.author.username ?? '?'}
            </span>
          </button>
        ))}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Story viewer */}
      {viewingGroup && (
        <StoryViewer
          stories={viewingGroup.stories}
          onClose={() => setViewingGroup(null)}
        />
      )}
    </>
  )
}
