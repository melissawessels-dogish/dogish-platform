'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import Image from 'next/image'

type Dog = { id: string; name: string }

export default function NewPostPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [dogs, setDogs] = useState<Dog[]>([])
  const [taggedDogs, setTaggedDogs] = useState<string[]>([])
  const [isPrivate, setIsPrivate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    async function loadContext() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: human } = await supabase
        .from('human')
        .select('username')
        .eq('id', user.id)
        .maybeSingle()
      setUsername(human?.username ?? null)

      const { data: userDogs } = await supabase
        .from('dog')
        .select('id, name')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })

      const dogList = userDogs ?? []
      setDogs(dogList)

      const dogParam = searchParams.get('dog')
      if (dogParam && dogList.some((d) => d.id === dogParam)) {
        setTaggedDogs([dogParam])
      } else if (dogList.length === 1) {
        setTaggedDogs([dogList[0].id])
      }
    }
    loadContext()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
  }

  const toggleDog = (id: string) => {
    setTaggedDogs((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!photo) return
    setSubmitting(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Upload photo
      const ext = photo.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(path, photo, { upsert: true })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('media').getPublicUrl(path)
      const imageUrl = urlData.publicUrl

      // Insert post
      const { data: post, error: postError } = await supabase
        .from('post')
        .insert({
          author_id: user.id,
          post_type: 'photo',
          body: caption.trim() || null,
          images: [imageUrl],
          is_private: isPrivate,
        })
        .select('id')
        .single()
      if (postError) throw postError

      // Tag dogs
      if (taggedDogs.length > 0) {
        const { error: tagError } = await supabase
          .from('post_dogs')
          .insert(taggedDogs.map((dogId) => ({ post_id: post.id, dog_id: dogId })))
        if (tagError) throw tagError
      }

      router.push(username ? `/${username}` : '/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  const primaryDogName = dogs.find((d) => taggedDogs.includes(d.id))?.name ?? null

  return (
    <div className="min-h-svh py-12 px-6 bg-white">
      <div className="w-full max-w-[480px] mx-auto flex flex-col">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/dogish-brand.svg"
          alt="Dogish"
          style={{ height: 40, display: 'block', margin: '0 auto 32px' }}
        />

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#0F2240]">New post</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Photo upload */}
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-full rounded-2xl overflow-hidden border-2 border-dashed border-[#0F2240]/20 hover:border-[#0F2240]/50 transition-colors bg-[#F7F3EE] focus:outline-none focus:ring-2 focus:ring-[#0F2240] focus:ring-offset-2"
            >
              {/* 4:5 aspect ratio container */}
              <div className="relative w-full" style={{ paddingTop: '125%' }}>
                {preview ? (
                  <>
                    <Image src={preview} alt="Preview" fill className="object-cover" />
                    <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-sm font-medium">Change photo</span>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-[#0F2240]/40 hover:text-[#0F2240] transition-colors">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span className="text-sm font-medium">Add a photo</span>
                  </div>
                )}
              </div>
            </button>
            <p className="text-xs text-[#0F2240]/40 mt-1.5">Photos display at 4:5 ratio</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          {/* Caption */}
          <div className="space-y-1.5">
            <Label className="text-[#0F2240] font-medium text-sm">Caption</Label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption…"
              rows={3}
              maxLength={500}
              className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] text-[#0F2240] resize-none"
            />
            <p className="text-xs text-[#0F2240]/40 text-right">{caption.length}/500</p>
          </div>

          {/* Tag dogs */}
          {dogs.length > 0 && (
            <div className="space-y-2">
              <Label className="text-[#0F2240] font-medium text-sm">Tag your dog</Label>
              <div className="flex flex-wrap gap-2">
                {dogs.map((dog) => (
                  <button
                    key={dog.id}
                    type="button"
                    onClick={() => toggleDog(dog.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      taggedDogs.includes(dog.id)
                        ? 'bg-[#0F2240] text-white'
                        : 'bg-[#F7F3EE] text-[#0F2240] hover:bg-[#EDE3D6]'
                    }`}
                  >
                    {dog.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Privacy */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-[#F7F3EE] border border-[#0F2240]/10">
            <div>
              <p className="text-sm font-medium text-[#0F2240]">Private post</p>
              <p className="text-xs text-[#0F2240]/50 mt-0.5">Only you can see this post.</p>
            </div>
            <Switch
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
              className="data-[state=checked]:bg-[#0F2240] shrink-0"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting || !photo}
            style={{ backgroundColor: '#0F2240' }}
            className="text-white h-10 mt-2 disabled:opacity-40"
          >
            {submitting ? 'Posting…' : 'Post'}
          </Button>
        </form>

        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-[#0F2240]/50 hover:text-[#0F2240] underline-offset-2 hover:underline transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
