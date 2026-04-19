'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Props = {
  kitId: string
  redirectTo: string
}

export default function DeleteKitButton({ kitId, redirectTo }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await supabase.from('kit').delete().eq('id', kitId)
    if (!error) {
      router.push(redirectTo)
    } else {
      setDeleting(false)
      setConfirming(false)
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm text-[#0F2240]/35 hover:text-red-500 transition-colors"
      >
        Delete kit
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <p className="text-sm text-[#0F2240]/60">Delete this kit permanently?</p>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50 transition-colors"
      >
        {deleting ? 'Deleting…' : 'Yes, delete'}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-sm text-[#0F2240]/40 hover:text-[#0F2240] transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}
