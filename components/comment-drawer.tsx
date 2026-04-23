'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { addComment } from '@/app/actions/comment'

type Comment = {
  id: string
  body: string
  created_at: string
  author: {
    id: string
    display_name: string | null
    username: string | null
    avatar: string | null
  }
}

export type DrawerCurrentUser = {
  id: string
  display_name: string | null
  username: string | null
  avatar: string | null
}

type Props = {
  postId: string
  open: boolean
  onClose: () => void
  commentCount: number
  onCommentCountChange: (delta: number) => void
  currentUser: DrawerCurrentUser | null
}

export default function CommentDrawer({ postId, open, onClose, commentCount, onCommentCountChange, currentUser }: Props) {
  const supabase = createClient()
  const [comments, setComments] = useState<Comment[]>([])
  const [loaded, setLoaded] = useState(false)
  const [input, setInput] = useState('')
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open || loaded) return
    supabase
      .from('comment')
      .select('id, body, created_at, author:human!author_id(id, display_name, username, avatar)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setComments((data ?? []) as unknown as Comment[])
        setLoaded(true)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loaded, postId])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300)
  }, [open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const body = input.trim()
    if (!body || !currentUser) return

    const optimistic: Comment = {
      id: `optimistic-${Date.now()}`,
      body,
      created_at: new Date().toISOString(),
      author: currentUser,
    }
    setComments((prev) => [...prev, optimistic])
    setInput('')
    onCommentCountChange(1)

    startTransition(async () => {
      const result = await addComment(postId, body)
      if (result?.error) {
        setComments((prev) => prev.filter((c) => c.id !== optimistic.id))
        setInput(body)
        onCommentCountChange(-1)
      }
    })
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/40" style={{ zIndex: 9998 }} onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[70vh] flex flex-col" style={{ zIndex: 9999 }}>
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-[#0F2240]/15" />
        </div>

        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#0F2240]/8 shrink-0">
          <span className="text-[14px] font-semibold text-[#0F2240]">
            Comments{commentCount > 0 ? ` (${commentCount})` : ''}
          </span>
          <button onClick={onClose} className="text-[#0F2240]/40 hover:text-[#0F2240] transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
          {!loaded && (
            <p className="text-sm text-[#0F2240]/40 text-center py-6">Loading…</p>
          )}
          {loaded && comments.length === 0 && (
            <p className="text-sm text-[#0F2240]/40 text-center py-6">No comments yet.</p>
          )}
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-2.5">
              <div className="relative w-7 h-7 rounded-full overflow-hidden bg-[#EDE3D6] shrink-0 mt-0.5">
                {comment.author.avatar ? (
                  <Image src={comment.author.avatar} alt={comment.author.display_name ?? ''} fill className="object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-[11px] font-bold text-[#0F2240]/40">
                    {(comment.author.display_name ?? comment.author.username ?? '?')[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-[#0F2240] leading-snug">
                  <span className="font-semibold mr-1">
                    {comment.author.username ?? comment.author.display_name}
                  </span>
                  {comment.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        {currentUser && (
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2.5 px-4 border-t border-[#0F2240]/8 shrink-0"
            style={{ paddingTop: 12, paddingBottom: 'calc(12px + 64px)' }}
          >
            <div className="relative w-7 h-7 rounded-full overflow-hidden bg-[#EDE3D6] shrink-0">
              {currentUser.avatar ? (
                <Image src={currentUser.avatar} alt={currentUser.display_name ?? ''} fill className="object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full text-[11px] font-bold text-[#0F2240]/40">
                  {(currentUser.display_name ?? currentUser.username ?? '?')[0].toUpperCase()}
                </div>
              )}
            </div>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Add a comment…"
              className="flex-1 text-[13px] text-[#0F2240] placeholder:text-[#0F2240]/35 outline-none bg-transparent"
              maxLength={500}
            />
            <button
              type="submit"
              disabled={!input.trim() || isPending}
              className="text-[13px] font-semibold text-[#0F2240] disabled:opacity-25 transition-opacity shrink-0"
            >
              Post
            </button>
          </form>
        )}
      </div>
    </>
  )
}
