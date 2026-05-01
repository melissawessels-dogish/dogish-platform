'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { Repeat2 } from 'lucide-react'
import { quickRepost, quoteRepost, undoRepost } from '@/app/actions/reposts'

type PostPreview = {
  id: string
  body: string | null
  images: string[] | null
  author: {
    display_name: string | null
    username: string | null
    avatar: string | null
  }
}

type Props = {
  post: PostPreview
  open: boolean
  isReposted: boolean
  onClose: () => void
  onRepostedChange: (reposted: boolean) => void
  onRepostCountChange: (delta: number) => void
}

const MAX_CHARS = 280

export default function RepostDrawer({
  post,
  open,
  isReposted,
  onClose,
  onRepostedChange,
  onRepostCountChange,
}: Props) {
  const [mode, setMode] = useState<'options' | 'compose'>('options')
  const [caption, setCaption] = useState('')
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Reset to options mode on open
  useEffect(() => {
    if (open) {
      setMode('options')
      setCaption('')
    }
  }, [open])

  // Auto-focus textarea when compose mode opens
  useEffect(() => {
    if (mode === 'compose') {
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [mode])

  // Close on backdrop click / Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const handleQuickRepost = () => {
    startTransition(async () => {
      try {
        await quickRepost(post.id)
        onRepostedChange(true)
        onRepostCountChange(1)
      } catch {}
      onClose()
    })
  }

  const handleUndo = () => {
    startTransition(async () => {
      try {
        await undoRepost(post.id)
        onRepostedChange(false)
        onRepostCountChange(-1)
      } catch {}
      onClose()
    })
  }

  const handleQuoteSubmit = () => {
    if (!caption.trim() || isPending) return
    startTransition(async () => {
      try {
        await quoteRepost(post.id, caption)
        onRepostedChange(true)
        if (!isReposted) onRepostCountChange(1)
      } catch {}
      onClose()
    })
  }

  if (!open) return null

  const image = post.images?.[0] ?? null
  const charsLeft = MAX_CHARS - caption.length

  const content = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-2xl shadow-xl max-w-lg mx-auto">

        {mode === 'options' ? (
          <>
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="text-[15px] font-semibold text-[#0F2240]">
                {isReposted ? 'Reposted' : 'Repost'}
              </h2>
              <button onClick={onClose} className="text-[#0F2240]/40 hover:text-[#0F2240]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-3 pb-8 flex flex-col gap-1">
              {isReposted ? (
                <button
                  onClick={handleUndo}
                  disabled={isPending}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-[#F7F3EE] transition-colors text-left disabled:opacity-50"
                >
                  <Repeat2 className="h-5 w-5 text-red-500 shrink-0" />
                  <div>
                    <p className="text-[14px] font-semibold text-[#0F2240]">Undo repost</p>
                    <p className="text-[12px] text-[#0F2240]/45">Remove this from your reposts</p>
                  </div>
                </button>
              ) : (
                <button
                  onClick={handleQuickRepost}
                  disabled={isPending}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-[#F7F3EE] transition-colors text-left disabled:opacity-50"
                >
                  <Repeat2 className="h-5 w-5 text-[#0F2240] shrink-0" />
                  <div>
                    <p className="text-[14px] font-semibold text-[#0F2240]">Repost</p>
                    <p className="text-[12px] text-[#0F2240]/45">Share to your followers instantly</p>
                  </div>
                </button>
              )}

              <button
                onClick={() => setMode('compose')}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-[#F7F3EE] transition-colors text-left"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F2240" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <div>
                  <p className="text-[14px] font-semibold text-[#0F2240]">Quote repost</p>
                  <p className="text-[12px] text-[#0F2240]/45">Add your own caption</p>
                </div>
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Compose header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#0F2240]/8">
              <button
                onClick={() => setMode('options')}
                className="text-[14px] text-[#0F2240]/50 hover:text-[#0F2240]"
              >
                Cancel
              </button>
              <span className="text-[14px] font-semibold text-[#0F2240]">Quote repost</span>
              <button
                onClick={handleQuoteSubmit}
                disabled={isPending || !caption.trim() || caption.length > MAX_CHARS}
                className="text-[14px] font-semibold bg-[#0F2240] text-white px-4 py-1.5 rounded-full disabled:opacity-40 transition-opacity"
              >
                Post
              </button>
            </div>

            {/* Textarea */}
            <div className="px-4 pt-3 pb-2">
              <textarea
                ref={textareaRef}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add your caption…"
                rows={3}
                maxLength={MAX_CHARS}
                className="w-full text-[15px] text-[#0F2240] placeholder:text-[#0F2240]/35 resize-none outline-none leading-relaxed"
              />
              <div className="flex justify-end">
                <span className={`text-[12px] ${charsLeft < 20 ? 'text-red-500' : 'text-[#0F2240]/30'}`}>
                  {charsLeft}
                </span>
              </div>
            </div>

            {/* Original post preview */}
            <div className="mx-4 mb-6 rounded-xl border border-[#0F2240]/10 overflow-hidden">
              {image && (
                <div className="relative w-full aspect-[16/9]">
                  <Image src={image} alt="" fill className="object-cover" />
                </div>
              )}
              <div className="px-3 py-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="relative w-5 h-5 rounded-full overflow-hidden bg-[#EDE3D6] shrink-0">
                    {post.author.avatar ? (
                      <Image src={post.author.avatar} alt="" fill className="object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-[8px] font-bold text-[#0F2240]/40">
                        {(post.author.display_name ?? post.author.username ?? '?')[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="text-[12px] font-semibold text-[#0F2240] truncate">
                    {post.author.display_name ?? post.author.username}
                  </span>
                </div>
                {post.body && (
                  <p className="text-[13px] text-[#0F2240]/70 line-clamp-2 leading-snug">{post.body}</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )

  return createPortal(content, document.body)
}
