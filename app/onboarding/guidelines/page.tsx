'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const POINTS = [
  'Dogish is not a dog marketplace. No buying, selling, or facilitating the adoption of dogs. We fully support responsible rescue organizations, shelters, and breeders.',
  'No content depicting animal abuse, neglect, or cruelty will be tolerated. Ever.',
  'We want Dogish to feel like running into another dog lover at the park — warm, generous, a little obsessed. If your dog is one of the best parts of your day, you\'re in the right place.',
]

export default function GuidelinesPage() {
  const router = useRouter()
  const [agreed, setAgreed] = useState(false)

  return (
    <div className="min-h-svh py-12 px-6 bg-white">
      <div className="w-full max-w-[480px] mx-auto flex flex-col">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/dogish-brand.svg"
          alt="Dogish"
          style={{ height: 40, display: 'block', margin: '0 auto 32px' }}
        />

        <div className="flex flex-col gap-2 text-center mb-8">
          <h1 className="text-2xl font-bold text-[#0F2240]">Before you join.</h1>
          <p className="text-sm text-muted-foreground">
            Dogs give us their best. We should do the same.
          </p>
        </div>

        <ul className="flex flex-col gap-3 mb-5">
          {POINTS.map((point) => (
            <li key={point} className="flex gap-3 text-sm text-[#0F2240]/80 leading-relaxed">
              <span className="mt-0.5 shrink-0 text-[#0F2240]/50 select-none">•</span>
              {point}
            </li>
          ))}
        </ul>

        <a
          href="/about/community-guidelines"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#0F2240]/50 hover:text-[#0F2240] transition-colors mb-8 inline-flex items-center gap-1"
        >
          Read the full Community Guidelines
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>

        <label className="flex items-start gap-3 cursor-pointer mb-6 group">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#0F2240]/30 accent-[#0F2240] cursor-pointer"
          />
          <span className="text-sm text-[#0F2240]/70 leading-relaxed group-hover:text-[#0F2240] transition-colors">
            I&apos;ve read the community guidelines and agree to uphold them.
          </span>
        </label>

        <button
          type="button"
          disabled={!agreed}
          onClick={() => router.push('/dogs/new')}
          className="h-10 rounded-md text-sm font-medium text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#0F2240' }}
        >
          I&apos;m in
        </button>
      </div>
    </div>
  )
}
