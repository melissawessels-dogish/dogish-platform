import Link from 'next/link'

export default function CommunityGuidelinesPage() {
  return (
    <div className="min-h-svh bg-white py-12 px-6">
      <div className="max-w-[680px] mx-auto">

        {/* Logo */}
        <div className="mb-10 text-center">
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/dogish-brand.svg"
              alt="Dogish"
              style={{ height: 36, display: 'inline-block' }}
            />
          </Link>
        </div>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-[#0F2240] mb-3">Community Guidelines</h1>
          <p className="text-base text-[#0F2240]/70 leading-relaxed">
            Dogs make life better. This is a place to share that joy.
          </p>
        </div>

        <div className="flex flex-col gap-6 mb-12 text-sm text-[#0F2240]/80 leading-relaxed">
          <p>
            <span className="font-bold text-[#0F2240]">What Dogish is. </span>
            Dogish is a social network for dog lovers — a place to celebrate your dog, discover what other people love, find the best local spots, and connect with people who get it. We&apos;re dog-obsessed in the best possible way.
          </p>
          <p>
            <span className="font-bold text-[#0F2240]">What Dogish is not. </span>
            Dogish is not a dog marketplace. Buying, selling, or facilitating the adoption of dogs through this platform is not permitted. We fully support the work of responsible rescue organizations, shelters, and breeders. If you&apos;re ready to grow your dog family, they&apos;re the right place to start.
          </p>
          <p>
            Content that depicts dogs being abused, neglected, or treated cruelly has no place here. This is a community built on love for dogs. We take that seriously.
          </p>
          <p>
            <span className="font-bold text-[#0F2240]">The kind of community we&apos;re building. </span>
            We want Dogish to feel like running into another dog lover at the park — warm, generous, a little obsessed. If you&apos;re here because your dog is the best part of your day, you&apos;re exactly who this is for.
          </p>
        </div>

        {/* Back to home */}
        <div className="text-center">
          <Link
            href="/"
            className="text-sm text-[#0F2240]/40 hover:text-[#0F2240] underline-offset-2 hover:underline transition-colors"
          >
            ← Back to home
          </Link>
        </div>

      </div>
    </div>
  )
}
