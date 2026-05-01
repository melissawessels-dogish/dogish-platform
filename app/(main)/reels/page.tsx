export default function ReelsPage() {
  return (
    <div className="min-h-svh bg-white flex flex-col items-center justify-center px-6 pb-16">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: '#EDE3D6' }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0F2240" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5">
          <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
          <line x1="7" y1="2" x2="7" y2="22" />
          <line x1="17" y1="2" x2="17" y2="22" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <line x1="2" y1="7" x2="7" y2="7" />
          <line x1="2" y1="17" x2="7" y2="17" />
          <line x1="17" y1="17" x2="22" y2="17" />
          <line x1="17" y1="7" x2="22" y2="7" />
        </svg>
      </div>
      <p className="text-[15px] font-semibold text-[#0F2240]">Reels coming soon</p>
      <p className="text-[13px] text-[#0F2240]/50 mt-1 text-center">Short dog videos are on their way.</p>
    </div>
  )
}
