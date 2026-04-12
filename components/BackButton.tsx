'use client'

import { useRouter } from 'next/navigation'

export default function BackButton({ className }: { className?: string }) {
  const router = useRouter()
  return (
    <button type="button" onClick={() => router.back()} className={className}>
      ← Back
    </button>
  )
}
