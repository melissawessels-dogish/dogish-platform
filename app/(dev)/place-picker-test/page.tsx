'use client'

import { useState } from 'react'
import PlacePicker from '@/components/ui/PlacePicker'

export default function PlacePickerTestPage() {
  const [result, setResult] = useState<{ id: string; name: string; city: string; state: string } | null>(null)

  return (
    <div className="max-w-md mx-auto p-8 space-y-6">
      <h1 className="text-xl font-semibold text-[#0F2240]">PlacePicker Test</h1>
      <PlacePicker
        onPlaceSelect={(place) => setResult(place)}
        placeholder="Search for a dog park, beach, café…"
      />
      {result && (
        <div className="rounded-lg border border-[#0F2240]/10 bg-[#F7F3EE] p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#0F2240]/40 mb-2">
            Selected place
          </p>
          <pre className="text-sm text-[#0F2240] whitespace-pre-wrap break-all">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
