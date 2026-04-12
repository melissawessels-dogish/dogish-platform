'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const USERNAME_RE = /^[a-z0-9_]*$/

function toSlug(first: string, last: string): string {
  return (first + last).toLowerCase().replace(/[^a-z0-9_]/g, '')
}

type DogEntry = {
  name: string
  avatar: string | null
  uploading: boolean
}

export default function ProfileSetupPage() {
  const router = useRouter()
  const supabase = createClient()

  // Human avatar
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [avatar, setAvatar] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  // Profile fields — no DB pre-fill, all start empty
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [displayNameTouched, setDisplayNameTouched] = useState(false)

  const [username, setUsername] = useState('')
  const [usernameCustomized, setUsernameCustomized] = useState(false)
  const [usernameEditable, setUsernameEditable] = useState(false)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [usernameSuggestion, setUsernameSuggestion] = useState<string | null>(null)

  // Dogs
  const [dogs, setDogs] = useState<DogEntry[]>([{ name: '', avatar: null, uploading: false }])
  const dogPhotoInputRef = useRef<HTMLInputElement>(null)
  const pendingDogIndex = useRef<number>(0)

  const [location, setLocation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Human avatar ──────────────────────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const ext = file.name.split('.').pop()
      const path = `avatars/${user!.id}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      setAvatar(urlData.publicUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Photo upload failed')
    } finally {
      setAvatarUploading(false)
      e.target.value = ''
    }
  }

  // ── Dog photo ─────────────────────────────────────────────────
  const openDogPhoto = (index: number) => {
    pendingDogIndex.current = index
    dogPhotoInputRef.current?.click()
  }

  const handleDogPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const index = pendingDogIndex.current
    setDogs((prev) => prev.map((d, i) => i === index ? { ...d, uploading: true } : d))
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const ext = file.name.split('.').pop()
      const path = `dogs/${user!.id}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      setDogs((prev) => prev.map((d, i) => i === index ? { ...d, avatar: urlData.publicUrl, uploading: false } : d))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dog photo upload failed')
      setDogs((prev) => prev.map((d, i) => i === index ? { ...d, uploading: false } : d))
    } finally {
      e.target.value = ''
    }
  }

  // ── Name fields ───────────────────────────────────────────────
  const handleFirstNameChange = (value: string) => {
    setFirstName(value)
    if (!displayNameTouched) setDisplayName(value)
    if (!usernameCustomized) setUsername(toSlug(value, lastName))
  }

  const handleLastNameChange = (value: string) => {
    setLastName(value)
    if (!usernameCustomized) setUsername(toSlug(firstName, value))
  }

  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value)
    setDisplayNameTouched(true)
  }

  // ── Username ──────────────────────────────────────────────────
  const handleCustomizeClick = () => {
    setUsernameEditable(true)
    setUsernameCustomized(true)
  }

  const handleUsernameChange = (value: string) => {
    const lower = value.toLowerCase()
    setUsername(lower)
    setUsernameSuggestion(null)
    if (lower && !USERNAME_RE.test(lower)) {
      setUsernameError('Only letters, numbers, and underscores')
    } else {
      setUsernameError(null)
    }
  }

  const checkUsernameTaken = async (slug: string): Promise<boolean> => {
    if (!slug) return false
    const { data: { user } } = await supabase.auth.getUser()
    const { data: existing } = await supabase
      .from('human')
      .select('id')
      .eq('username', slug)
      .neq('id', user?.id ?? '')
      .maybeSingle()
    return !!existing
  }

  const handleUsernameBlur = async () => {
    const trimmed = username.trim()
    if (!trimmed || usernameError) return
    const taken = await checkUsernameTaken(trimmed)
    if (taken) {
      setUsernameError('That profile link is taken')
      setUsernameEditable(true)
      setUsernameCustomized(true)
      setUsernameSuggestion(`${trimmed}2`)
    }
  }

  // ── Dogs ──────────────────────────────────────────────────────
  const addDog = () => {
    if (dogs.length < 5) setDogs([...dogs, { name: '', avatar: null, uploading: false }])
  }

  const removeDog = (index: number) => {
    setDogs(dogs.filter((_, i) => i !== index))
  }

  const updateDogName = (index: number, value: string) => {
    setDogs((prev) => prev.map((d, i) => i === index ? { ...d, name: value } : d))
  }

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (usernameError) return
    setSubmitting(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Final uniqueness check
      if (username) {
        const taken = await checkUsernameTaken(username)
        if (taken) {
          setUsernameError('That profile link is taken')
          setUsernameEditable(true)
          setUsernameCustomized(true)
          setUsernameSuggestion(`${username}2`)
          setSubmitting(false)
          return
        }
      }

      const { error: updateError } = await supabase
        .from('human')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          display_name: displayName.trim() || firstName.trim(),
          username: username || null,
          location: location.trim() || null,
          avatar: avatar ?? null,
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      const dogEntries = dogs.filter((d) => d.name.trim())
      if (dogEntries.length > 0) {
        const { error: dogError } = await supabase
          .from('dog')
          .insert(dogEntries.map((d) => ({
            owner_id: user.id,
            name: d.name.trim(),
            sex: 'unknown',
            avatar: d.avatar ?? null,
          })))
        if (dogError) throw dogError
      }

      router.push('/onboarding/dogs')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  const canSubmit =
    !!firstName.trim() && !!lastName.trim() && !!dogs[0].name.trim() && !usernameError && !submitting

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="min-h-svh bg-white">
      <div className="max-w-[480px] mx-auto px-6 py-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/dogish-brand.svg"
          alt="Dogish"
          style={{ height: 36, display: 'block', margin: '0 auto 32px' }}
        />

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#0F2240]">Create your profile</h1>
          <p className="text-sm text-[#0F2240]/55 mt-1.5">Tell the community a little about yourself.</p>
        </div>

        <form onSubmit={handleSubmit} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }} className="flex flex-col gap-5">

          {/* Photo row: human + dogs */}
          <div className="flex items-start gap-4 flex-wrap">
            {/* Human photo */}
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="relative group w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-[#0F2240]/20 hover:border-[#0F2240]/50 transition-colors bg-[#F7F3EE] focus:outline-none focus:ring-2 focus:ring-[#0F2240] focus:ring-offset-2 disabled:opacity-60"
              >
                {avatar ? (
                  <>
                    <Image src={avatar} alt="Your photo" fill className="object-cover" />
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
                    <span className="text-[10px] font-medium uppercase tracking-wide">
                      {avatarUploading ? '…' : 'Photo'}
                    </span>
                  </div>
                )}
              </button>
              <span className="text-[11px] font-medium text-[#0F2240]/50 w-24 text-center truncate">
                {firstName || 'You'}
              </span>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            {/* Dog photos */}
            {dogs.map((dog, index) => (
              <div key={index} className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openDogPhoto(index)}
                  disabled={dog.uploading}
                  className="relative group w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-[#0F2240]/20 hover:border-[#0F2240]/50 transition-colors bg-[#F7F3EE] focus:outline-none focus:ring-2 focus:ring-[#0F2240] focus:ring-offset-2 disabled:opacity-60"
                >
                  {dog.avatar ? (
                    <>
                      <Image src={dog.avatar} alt="Dog photo" fill className="object-cover" />
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
                      <span className="text-[10px] font-medium uppercase tracking-wide">
                        {dog.uploading ? '…' : 'Dog'}
                      </span>
                    </div>
                  )}
                </button>
                <span className="text-[11px] font-medium text-[#0F2240]/50 w-24 text-center truncate">
                  {dog.name || 'Dog'}
                </span>
              </div>
            ))}

            {/* Hidden file input shared across all dog slots */}
            <input
              ref={dogPhotoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleDogPhotoChange}
            />
          </div>

          {/* First + Last name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="first_name" className="text-[#0F2240] font-medium text-sm">
                First name <span className="text-[#C4855A]">*</span>
              </Label>
              <Input
                id="first_name"
                value={firstName}
                onChange={(e) => handleFirstNameChange(e.target.value)}
                placeholder="Melissa"
                required
                autoFocus
                className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] text-[#0F2240]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name" className="text-[#0F2240] font-medium text-sm">
                Last name <span className="text-[#C4855A]">*</span>
              </Label>
              <Input
                id="last_name"
                value={lastName}
                onChange={(e) => handleLastNameChange(e.target.value)}
                placeholder="Wessels"
                required
                className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] text-[#0F2240]"
              />
            </div>
          </div>

          {/* Display name */}
          <div className="space-y-1.5">
            <Label htmlFor="display_name" className="text-[#0F2240] font-medium text-sm">
              How you&apos;ll appear on Dogish
            </Label>
            <Input
              id="display_name"
              value={displayName}
              onChange={(e) => handleDisplayNameChange(e.target.value)}
              placeholder="Your name"
              className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] text-[#0F2240]"
            />
          </div>

          {/* Profile link */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[#0F2240] font-medium text-sm">Profile link</Label>
              {!usernameEditable && (
                <button
                  type="button"
                  onClick={handleCustomizeClick}
                  className="text-[12px] text-[#0F2240]/50 hover:text-[#0F2240] underline underline-offset-2 transition-colors"
                >
                  Customize
                </button>
              )}
            </div>
            <div className="flex items-center rounded-md border border-[#0F2240]/20 focus-within:ring-2 focus-within:ring-[#0F2240] overflow-hidden">
              <span className="px-3 text-sm text-[#0F2240]/40 bg-[#F7F3EE] border-r border-[#0F2240]/20 h-10 flex items-center shrink-0 select-none">
                dogish.com/
              </span>
              {usernameEditable ? (
                <input
                  type="text"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  onBlur={handleUsernameBlur}
                  placeholder={usernameSuggestion ?? 'yourname'}
                  className="flex-1 h-10 px-3 text-sm text-[#0F2240] bg-white outline-none placeholder:text-[#0F2240]/30"
                />
              ) : (
                <span className="flex-1 h-10 px-3 text-sm flex items-center select-none text-[#0F2240]/60">
                  {username || <span className="text-[#0F2240]/30">yourname</span>}
                </span>
              )}
            </div>
            {usernameError && (
              <p className="text-xs text-red-600">{usernameError}</p>
            )}
          </div>

          {/* Dogs */}
          <div className="space-y-2">
            <Label className="text-[#0F2240] font-medium text-sm">
              Your dog&apos;s name <span className="text-[#C4855A]">*</span>
            </Label>
            <div className="flex flex-col gap-2">
              {dogs.map((dog, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={dog.name}
                    onChange={(e) => updateDogName(index, e.target.value)}
                    placeholder={index === 0 ? 'e.g. Biscuit' : "Dog's name"}
                    required={index === 0}
                    className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] text-[#0F2240] flex-1"
                  />
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => removeDog(index)}
                      className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-[#0F2240]/40 hover:text-[#0F2240] hover:bg-[#F7F3EE] transition-colors"
                      aria-label="Remove dog"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            {dogs.length < 5 && (
              <button
                type="button"
                onClick={addDog}
                className="text-[13px] text-[#0F2240]/50 hover:text-[#0F2240] transition-colors flex items-center gap-1"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add another dog
              </button>
            )}
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
            <p className="text-xs text-[#0F2240]/40">
              Helps us connect you with local dog owners, parks, and places.
            </p>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="h-10 rounded-md text-sm font-semibold text-white disabled:opacity-40 transition-opacity mt-2"
            style={{ backgroundColor: '#0F2240' }}
          >
            {submitting ? 'Setting up…' : 'Continue'}
          </button>

          <p className="text-center text-[11px] text-[#0F2240]/40 leading-relaxed mt-3">
            By continuing you agree to our{' '}
            <a href="/about/terms" className="underline underline-offset-2 hover:text-[#0F2240]/70 transition-colors">Terms of Service</a>
            {', '}
            <a href="/about/privacy" className="underline underline-offset-2 hover:text-[#0F2240]/70 transition-colors">Privacy Policy</a>
            {', and '}
            <a href="/about/community-guidelines" className="underline underline-offset-2 hover:text-[#0F2240]/70 transition-colors">Community Guidelines</a>
            {'.'}
          </p>

        </form>
      </div>
    </div>
  )
}
