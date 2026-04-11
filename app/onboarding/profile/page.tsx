'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Image from 'next/image'

const USERNAME_RE = /^[a-z0-9_]*$/

function AvatarUploader({
  preview,
  onChange,
}: {
  preview: string | null
  onChange: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative group w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-[#0F2240]/30 hover:border-[#0F2240] transition-colors bg-[#F7F3EE] focus:outline-none focus:ring-2 focus:ring-[#0F2240] focus:ring-offset-2"
      >
        {preview ? (
          <>
            <Image src={preview} alt="Profile photo" fill className="object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-medium">Change</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-1.5 text-[#0F2240]/40 group-hover:text-[#0F2240] transition-colors">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className="text-[10px] font-medium tracking-wide uppercase">Photo</span>
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onChange(file)
        }}
      />
    </div>
  )
}

export default function ProfileSetupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [location, setLocation] = useState('')
  const [avatar, setAvatar] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAvatarChange = (file: File) => {
    setAvatar(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleUsernameChange = (value: string) => {
    const lower = value.toLowerCase()
    setUsername(lower)
    if (lower && !USERNAME_RE.test(lower)) {
      setUsernameError('Only letters, numbers, and underscores allowed')
    } else {
      setUsernameError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (usernameError) return

    setSubmitting(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Check username availability
      if (username) {
        const { data: existing } = await supabase
          .from('human')
          .select('id')
          .eq('username', username)
          .neq('id', user.id)
          .maybeSingle()
        if (existing) {
          setUsernameError('That username is taken')
          setSubmitting(false)
          return
        }
      }

      let avatarUrl: string | null = null
      if (avatar) {
        const ext = avatar.name.split('.').pop()
        const path = `${user.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, avatar, { upsert: true })
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = urlData.publicUrl
      }

      const { error: updateError } = await supabase
        .from('human')
        .update({
          display_name: displayName.trim(),
          username: username || null,
          avatar: avatarUrl,
          location: location.trim() || null,
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      router.push('/onboarding/guidelines')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

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
          <h1 className="text-2xl font-bold">Create your profile</h1>
          <p className="text-sm text-muted-foreground">Tell the community a little about yourself.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex justify-center">
            <AvatarUploader preview={avatarPreview} onChange={handleAvatarChange} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="display_name" className="text-[#0F2240] font-medium text-sm">
              Display name <span className="text-[#C4855A]">*</span>
            </Label>
            <Input
              id="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="What should we call you?"
              required
              autoFocus
              className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] text-[#0F2240]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-[#0F2240] font-medium text-sm">Username</Label>
            <div className="flex items-center rounded-md border border-[#0F2240]/20 focus-within:ring-2 focus-within:ring-[#0F2240] focus-within:ring-offset-0 overflow-hidden">
              <span className="px-3 text-sm text-[#0F2240]/40 bg-[#F7F3EE] border-r border-[#0F2240]/20 h-10 flex items-center shrink-0 select-none">
                dogish.com/
              </span>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="yourname"
                className="flex-1 h-10 px-3 text-sm text-[#0F2240] bg-white outline-none placeholder:text-[#0F2240]/30"
              />
            </div>
            {usernameError && (
              <p className="text-xs text-red-600">{usernameError}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="location" className="text-[#0F2240] font-medium text-sm">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, State"
              className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] text-[#0F2240]"
            />
            <p className="text-xs text-[#0F2240]/40">Helps us connect you with local dog owners, parks, and places.</p>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting || !displayName.trim() || !!usernameError}
            style={{ backgroundColor: '#0F2240' }}
            className="text-white h-10 mt-2 disabled:opacity-40"
          >
            {submitting ? 'Saving…' : 'Continue'}
          </Button>
        </form>

        <div className="text-center mt-4">
          <a
            href="/dogs/new"
            className="text-sm text-[#0F2240]/50 hover:text-[#0F2240] underline-offset-2 hover:underline transition-colors"
          >
            Skip for now
          </a>
        </div>
      </div>
    </div>
  )
}
