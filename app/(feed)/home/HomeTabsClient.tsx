'use client'

import { useState } from 'react'
import ReelsInlineView from './ReelsInlineView'

export default function HomeTabsClient({ children }: { children: React.ReactNode }) {
  const [tab, setTab] = useState<'feed' | 'reels'>('feed')

  return (
    <>
      {/* Segmented control — matches Profile tabs visual */}
      <div className="border-b border-[#0F2240]/8 px-4">
        <div className="flex gap-6">
          {(['feed', 'reels'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="pb-3 pt-3 text-[14px] font-medium transition-colors relative capitalize"
              style={{ color: tab === t ? '#0F2240' : 'rgba(15,34,64,0.4)' }}
            >
              {t}
              {tab === t && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0F2240] rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Feed — hidden (not unmounted) when Reels is active */}
      <div style={{ display: tab === 'feed' ? 'block' : 'none', paddingBottom: 64 }}>
        {children}
      </div>

      {/* Reels — normal-flow snap-scroll, mounted immediately, shown/hidden by parent */}
      <div style={{ display: tab === 'reels' ? 'block' : 'none' }}>
        <ReelsInlineView isActive={tab === 'reels'} />
      </div>
    </>
  )
}
