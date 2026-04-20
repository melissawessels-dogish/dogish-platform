'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Bookmark, FolderPlus, X } from 'lucide-react'
import { createFolder, unsavePost } from '@/app/actions/saved-posts'
import { cn } from '@/lib/utils'

export type SavedPost = {
  id: string
  post_id: string
  folder_id: string | null
  created_at: string
  post: {
    id: string
    body: string | null
    images: string[] | null
    created_at: string
    author: {
      username: string | null
      display_name: string | null
      avatar: string | null
    } | null
  } | null
}

type Folder = {
  id: string
  name: string
}

interface SavedPageClientProps {
  savedPosts: SavedPost[]
  folders: Folder[]
}

export function SavedPageClient({ savedPosts: initialSaved, folders: initialFolders }: SavedPageClientProps) {
  const [savedPosts, setSavedPosts] = useState(initialSaved)
  const [folders, setFolders] = useState(initialFolders)
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isPending, startTransition] = useTransition()

  const displayedPosts = activeFolder
    ? savedPosts.filter(s => s.folder_id === activeFolder)
    : savedPosts

  function handleCreateFolder() {
    if (!newFolderName.trim()) return
    startTransition(async () => {
      const result = await createFolder(newFolderName.trim())
      if ('folder' in result && result.folder) {
        setFolders(prev => [...prev, result.folder as Folder])
        setNewFolderName('')
        setShowNewFolder(false)
      }
    })
  }

  function handleUnsave(postId: string) {
    setSavedPosts(prev => prev.filter(s => s.post_id !== postId))
    startTransition(async () => {
      await unsavePost(postId)
    })
  }

  return (
    <div className="max-w-[640px] mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[18px] font-bold text-[#0F2240]">Saved</h1>
        <button
          onClick={() => setShowNewFolder(true)}
          className="flex items-center gap-1.5 text-sm text-[#0F2240]/60 hover:text-[#0F2240] transition-colors"
        >
          <FolderPlus size={16} />
          New folder
        </button>
      </div>

      {/* New folder input */}
      {showNewFolder && (
        <div className="flex gap-2 mb-4">
          <input
            autoFocus
            type="text"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreateFolder()
              if (e.key === 'Escape') setShowNewFolder(false)
            }}
            placeholder="Folder name"
            className="flex-1 border border-[#0F2240]/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0F2240] text-[#0F2240]"
          />
          <button
            onClick={handleCreateFolder}
            disabled={isPending || !newFolderName.trim()}
            className="px-4 py-2 text-white text-sm rounded-lg disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: '#0F2240' }}
          >
            Create
          </button>
          <button
            onClick={() => setShowNewFolder(false)}
            className="p-2 text-[#0F2240]/40 hover:text-[#0F2240] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Folder tabs */}
      {(folders.length > 0 || savedPosts.length > 0) && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
          <button
            onClick={() => setActiveFolder(null)}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              activeFolder === null
                ? 'bg-[#0F2240] text-white'
                : 'bg-[#0F2240]/8 text-[#0F2240]/70 hover:bg-[#0F2240]/12'
            )}
          >
            All saved
          </button>
          {folders.map(folder => (
            <button
              key={folder.id}
              onClick={() => setActiveFolder(folder.id)}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                activeFolder === folder.id
                  ? 'bg-[#0F2240] text-white'
                  : 'bg-[#0F2240]/8 text-[#0F2240]/70 hover:bg-[#0F2240]/12'
              )}
            >
              {folder.name}
            </button>
          ))}
        </div>
      )}

      {/* Posts grid */}
      {displayedPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Bookmark size={40} strokeWidth={1.5} className="text-[#0F2240]/20 mb-3" />
          <p className="text-sm text-[#0F2240]/40">
            {activeFolder ? 'No posts in this folder yet.' : 'Nothing saved yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-px">
          {displayedPosts.map(saved => {
            const post = saved.post
            const image = post?.images?.[0]
            return (
              <div key={saved.id} className="relative aspect-[4/5] bg-[#EDE3D6] group">
                <Link href={`/posts/${saved.post_id}`} className="block w-full h-full">
                  {image ? (
                    <Image
                      src={image}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-2">
                      <span className="text-[10px] text-[#0F2240]/40 text-center line-clamp-4 leading-tight">
                        {post?.body}
                      </span>
                    </div>
                  )}
                </Link>
                <button
                  onClick={() => handleUnsave(saved.post_id)}
                  className="absolute top-1.5 right-1.5 p-1.5 bg-white/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove from saved"
                >
                  <X size={12} className="text-[#0F2240]" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
