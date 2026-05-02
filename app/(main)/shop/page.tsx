import CurrentUserAvatar from '@/components/CurrentUserAvatar'

export const dynamic = 'force-dynamic'

export default function ShopPage() {
  return (
    <div className="min-h-svh bg-[#F7F3EE]">
      <div className="sticky top-0 bg-white z-10 border-b border-[#0F2240]/6 px-4 flex items-center justify-between pt-4 pb-3">
        <span className="text-[18px] font-bold text-[#0F2240]">Shop</span>
        <CurrentUserAvatar />
      </div>
      <div className="max-w-[640px] mx-auto px-6 pt-8 pb-24">
        <h1 className="text-[28px] font-bold text-[#0F2240] leading-tight mb-3">The Shop</h1>
        <p className="text-[16px] text-[#0F2240]/55 leading-relaxed">
          Curated independent dog brands. Launching soon.
        </p>
      </div>
    </div>
  )
}
