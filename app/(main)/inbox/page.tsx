'use client'

import { useState } from 'react'

const tabs = ['Messages', 'Activity'] as const
type Tab = typeof tabs[number]

export default function InboxPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Messages')

  return (
    <div className="min-h-svh bg-white">
      <div className="max-w-[640px] mx-auto">

        <div className="px-4 pt-4 pb-0 border-b border-[#0F2240]/8">
          <h1 className="text-[18px] font-bold text-[#0F2240] mb-3">Inbox</h1>
          <div className="flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className="pb-3 text-[14px] font-medium transition-colors relative"
                style={{ color: activeTab === tab ? '#0F2240' : 'rgba(15,34,64,0.4)' }}
              >
                {tab}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0F2240] rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: '#EDE3D6' }}
          >
            {activeTab === 'Messages' ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0F2240" strokeWidth="1.5" opacity="0.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0F2240" strokeWidth="1.5" opacity="0.5">
                <path d="M18 20V10M12 20V4M6 20v-6" />
              </svg>
            )}
          </div>
          <p className="text-[15px] font-semibold text-[#0F2240]">
            {activeTab === 'Messages' ? 'No messages yet' : 'No activity yet'}
          </p>
          <p className="text-[13px] text-[#0F2240]/50 mt-1">
            {activeTab === 'Messages'
              ? 'Your conversations will appear here.'
              : 'Likes, follows, and comments will appear here.'}
          </p>
        </div>

      </div>
    </div>
  )
}
