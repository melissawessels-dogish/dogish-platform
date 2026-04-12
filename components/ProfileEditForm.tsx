'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { updateProfile } from '@/app/actions/profile'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const USERNAME_RE = /^[a-z0-9_]*$/

type Props = {
  userId: string
  initial: {
    display_name: string
    username: string
    bio: string
    location: string
    website: string
    avatar: string | null
    cover_photo: string | null
  }
}

export default function ProfileEditForm({ userId, initial }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState(initial.display_name)
  const [username, setUsername] = useState(initial.username)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [bio, setBio] = useState(initial.bio)
  const [location, setLocation] = useState(initial.location)
  const [website, setWebsite] = useState(initial.website)
  const [avatar, setAvatar] = useState<string | null>(initial.avatar)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [coverPhoto, setCoverPhoto] = useState<string | null>(initial.cover_photo)
  const [coverUploading, setCoverUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const handleUsernameChange = (value: string) => {
    const lower = value.toLowerCase()
    setUsername(lower)
    if (lower && !USERNAME_RE.test(lower)) {
      setUsernameError('Only letters, numbers, and underscores')
    } else {
      setUsernameError(null)
    }
  }

  const handleUsernameBlur = async () => {
    const trimmed = username.trim()
    if (!trimmed || trimmed === initial.username || usernameError) return
    const { data: existing } = await supabase
      .from('human')
      .select('id')
      .eq('username', trimmed)
      .neq('id', userId)
      .maybeSingle()
    if (existing) setUsernameError('That username is taken')
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${userId}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      setAvatar(urlData.publicUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Avatar upload failed')
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `covers/${userId}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('media').getPublicUrl(path)
      setCoverPhoto(urlData.publicUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cover photo upload failed')
    } finally {
      setCoverUploading(false)
    }
  }

  const handleSave = async () => {
    if (usernameError || !displayName.trim()) return
    setSubmitting(true)
    setError(null)
    setSaved(false)

    const result = await updateProfile({
      display_name: displayName,
      username,
      bio,
      location,
      website,
      avatar,
      cover_photo: coverPhoto,
    })

    if (result?.error) {
      setError(result.error)
      setSubmitting(false)
      return
    }

    const newUsername = result.username ?? username
    router.push(`/${newUsername}`)
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Cover photo */}
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => coverInputRef.current?.click()}
          disabled={coverUploading}
          className="relative w-full overflow-hidden rounded-xl bg-[#EDE3D6] focus:outline-none focus:ring-2 focus:ring-[#0F2240] focus:ring-offset-2 disabled:opacity-60 group"
          style={{ aspectRatio: '3 / 1' }}
        >
          {coverPhoto && (
            <Image src={coverPhoto} alt="Cover photo" fill className="object-cover" />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-[#0F2240]/40 group-hover:text-[#0F2240] group-hover:bg-black/10 transition-all">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span className="text-[11px] font-medium">
              {coverUploading ? 'Uploading…' : 'Change cover photo'}
            </span>
          </div>
        </button>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCoverChange}
        />
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={avatarUploading}
          className="relative group w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-[#0F2240]/20 hover:border-[#0F2240]/50 transition-colors bg-[#F7F3EE] focus:outline-none focus:ring-2 focus:ring-[#0F2240] focus:ring-offset-2 disabled:opacity-60"
        >
          {avatar ? (
            <>
              <Image src={avatar} alt="Avatar" fill className="object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-xs font-medium">Change</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-1 text-[#0F2240]/40 group-hover:text-[#0F2240] transition-colors">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="text-[10px] font-medium uppercase tracking-wide">Photo</span>
            </div>
          )}
        </button>
        {avatarUploading && (
          <p className="text-[12px] text-[#0F2240]/50">Uploading…</p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>

      {/* Display name */}
      <div className="space-y-1.5">
        <Label htmlFor="display_name" className="text-[#0F2240] font-medium text-sm">
          Display name <span className="text-[#C4855A]">*</span>
        </Label>
        <Input
          id="display_name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
          className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] text-[#0F2240]"
        />
      </div>

      {/* Username */}
      <div className="space-y-1.5">
        <Label htmlFor="username" className="text-[#0F2240] font-medium text-sm">Username</Label>
        <div className="flex items-center rounded-md border border-[#0F2240]/20 focus-within:ring-2 focus-within:ring-[#0F2240] overflow-hidden">
          <span className="px-3 text-sm text-[#0F2240]/40 bg-[#F7F3EE] border-r border-[#0F2240]/20 h-10 flex items-center shrink-0 select-none">
            dogish.com/
          </span>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => handleUsernameChange(e.target.value)}
            onBlur={handleUsernameBlur}
            placeholder="yourname"
            className="flex-1 h-10 px-3 text-sm text-[#0F2240] bg-white outline-none placeholder:text-[#0F2240]/30"
          />
        </div>
        {usernameError && (
          <p className="text-xs text-red-600">{usernameError}</p>
        )}
      </div>

      {/* Bio */}
      <div className="space-y-1.5">
        <Label htmlFor="bio" className="text-[#0F2240] font-medium text-sm">Bio</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell people about yourself"
          rows={3}
          maxLength={150}
          className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] text-[#0F2240] resize-none"
        />
        <p className="text-xs text-[#0F2240]/40 text-right">{bio.length}/150</p>
      </div>

      {/* Location */}
      <div className="space-y-1.5">
        <Label htmlFor="location" className="text-[#0F2240] font-medium text-sm">Location</Label>
        <Input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="City, State"
          className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] text-[#0F2240]"
        />
      </div>

      {/* Website */}
      <div className="space-y-1.5">
        <Label htmlFor="website" className="text-[#0F2240] font-medium text-sm">Website</Label>
        <Input
          id="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://"
          type="url"
          className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] text-[#0F2240]"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Saved confirmation */}
      {saved && (
        <p className="text-sm text-center text-green-600">Profile saved.</p>
      )}

      {/* Save button (bottom, for mobile convenience) */}
      <button
        type="button"
        onClick={handleSave}
        disabled={submitting || avatarUploading || coverUploading || !displayName.trim() || !!usernameError}
        className="h-10 rounded-md text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
        style={{ backgroundColor: '#0F2240' }}
      >
        {submitting ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  )
}
