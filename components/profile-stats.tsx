'use client'

import { useState } from 'react'
import FollowListDrawer from '@/components/follow-list-drawer'

type Props = {
  profileUserId: string
  currentUserId: string | null
  postCount: number
  followerCount: number
  followingCount: number
}

export default function ProfileStats({ profileUserId, currentUserId, postCount, followerCount, followingCount }: Props) {
  const [drawerType, setDrawerType] = useState<'followers' | 'following' | null>(null)

  return (
    <>
      <div className="flex items-center gap-1.5 mt-2 text-[13px] text-[#0F2240]/50">
        <span>
          <span className="font-semibold text-[#0F2240]">{postCount}</span> Posts
        </span>
        <span className="select-none">·</span>
        <button
          onClick={() => setDrawerType('followers')}
          className="hover:text-[#0F2240] transition-colors"
        >
          <span className="font-semibold text-[#0F2240]">{followerCount}</span> Followers
        </button>
        <span className="select-none">·</span>
        <button
          onClick={() => setDrawerType('following')}
          className="hover:text-[#0F2240] transition-colors"
        >
          <span className="font-semibold text-[#0F2240]">{followingCount}</span> Following
        </button>
      </div>

      <FollowListDrawer
        profileUserId={profileUserId}
        currentUserId={currentUserId}
        type={drawerType ?? 'followers'}
        open={drawerType !== null}
        onClose={() => setDrawerType(null)}
      />
    </>
  )
}
