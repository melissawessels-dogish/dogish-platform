'use client'

import { useState, useRef, useTransition } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'
import { addComment, deleteComment } from '@/app/actions/comment'

export type Comment = {
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

type CurrentUser = {
  id: string
  display_name: string | null
  username: string | null
  avatar: string | null
}

type Props = {
  postId: string
  initialComments: Comment[]
  currentUser: CurrentUser | null
}

export default function CommentsSection({ postId, initialComments, currentUser }: Props) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [input, setInput] = useState('')
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const body = input.trim()
    if (!body || !currentUser) return

    // Optimistic add
    const optimistic: Comment = {
      id: `optimistic-${Date.now()}`,
      body,
      created_at: new Date().toISOString(),
      author: currentUser,
    }
    setComments((prev) => [...prev, optimistic])
    setInput('')

    startTransition(async () => {
      const result = await addComment(postId, body)
      if (result?.error) {
        // Revert
        setComments((prev) => prev.filter((c) => c.id !== optimistic.id))
        setInput(body)
      }
    })
  }

  const handleDelete = (commentId: string) => {
    // Optimistic remove
    const prev = comments
    setComments((c) => c.filter((x) => x.id !== commentId))

    startTransition(async () => {
      const result = await deleteComment(commentId, postId)
      if (result?.error) {
        setComments(prev)
      }
    })
  }

  return (
    <section id="comments" className="border-t border-[#0F2240]/8 mt-2">

      {/* Comment list */}
      {comments.length > 0 && (
        <div className="px-4 pt-4 flex flex-col gap-3">
          {comments.map((comment) => {
            const isOwn = currentUser?.id === comment.author.id
            return (
              <div key={comment.id} className="flex items-start gap-2.5 group">
                {/* Avatar */}
                <div className="relative w-7 h-7 rounded-full overflow-hidden bg-[#EDE3D6] shrink-0 mt-0.5">
                  {comment.author.avatar ? (
                    <Image
                      src={comment.author.avatar}
                      alt={comment.author.display_name ?? ''}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-[11px] font-bold text-[#0F2240]/40">
                      {(comment.author.display_name ?? comment.author.username ?? '?')[0].toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#0F2240] leading-snug">
                    <span className="font-semibold mr-1">
                      {comment.author.username ?? comment.author.display_name}
                    </span>
                    {comment.body}
                  </p>
                </div>

                {/* Delete — own comments only, visible on hover */}
                {isOwn && (
                  <button
                    type="button"
                    onClick={() => handleDelete(comment.id)}
                    aria-label="Delete comment"
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[#0F2240]/30 hover:text-red-500 mt-0.5"
                  >
                    <X size={14} strokeWidth={2} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Comment input */}
      {currentUser && (
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2.5 px-4 py-3 border-t border-[#0F2240]/8 mt-3"
        >
          {/* Current user avatar */}
          <div className="relative w-7 h-7 rounded-full overflow-hidden bg-[#EDE3D6] shrink-0">
            {currentUser.avatar ? (
              <Image
                src={currentUser.avatar}
                alt={currentUser.display_name ?? ''}
                fill
                className="object-cover"
              />
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
    </section>
  )
}
