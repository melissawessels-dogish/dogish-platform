'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import Image from 'next/image'

type DogSize = 'xs' | 'small' | 'medium' | 'large' | 'xl'
type DogSex = 'male' | 'female' | 'unknown'

interface BreedResult {
  id: string
  name: string
}

interface FormData {
  name: string
  avatar: File | null
  avatarPreview: string | null
  breeds: { id: string; name: string; is_primary: boolean }[]
  mixDescription: string
  birthday: string
  size: DogSize | ''
  sex: DogSex
  bio: string
  personalityTags: string[]
  allergies: string[]
  allergyInput: string
  isPrivate: boolean
}

const PERSONALITY_TAGS = [
  'cuddler', 'friendly', 'playful', 'adventurer', 'zoomies',
  'ball-obsessed', 'water-dog', 'foodie', 'social butterfly', 'velcro-dog',
  'curious', 'calm', 'protector', 'independent', 'couch-potato',
  'moody', 'anxious', 'fierce', 'stubborn', 'vocal',
  'dramatic', 'selective', 'suspicious', 'sensitive', 'mischievous', 'extra',
]

const COMMON_ALLERGIES = [
  'None', 'chicken', 'beef', 'wheat', 'corn', 'soy',
  'dairy', 'eggs', 'fish', 'lamb', 'pork',
]

const SIZE_OPTIONS: { value: DogSize; label: string; range: string }[] = [
  { value: 'xs', label: 'XS', range: 'Under 10 lbs' },
  { value: 'small', label: 'S', range: '10–25 lbs' },
  { value: 'medium', label: 'M', range: '25–60 lbs' },
  { value: 'large', label: 'L', range: '60–100 lbs' },
  { value: 'xl', label: 'XL', range: 'Over 100 lbs' },
]

const SEX_OPTIONS: { value: DogSex; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
]

const TOTAL_STEPS = 4

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-500 ${
            i < current
              ? 'bg-[#0F2240] w-6'
              : i === current
              ? 'bg-[#0F2240] w-10'
              : 'bg-[#0F2240]/20 w-6'
          }`}
        />
      ))}
    </div>
  )
}

function AvatarUploader({
  preview,
  name,
  onChange,
}: {
  preview: string | null
  name: string
  onChange: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative group w-28 h-28 rounded-full overflow-hidden border-2 border-dashed border-[#0F2240]/30 hover:border-[#0F2240] transition-colors bg-[#F7F3EE] focus:outline-none focus:ring-2 focus:ring-[#0F2240] focus:ring-offset-2"
      >
        {preview ? (
          <>
            <Image src={preview} alt="Dog avatar" fill className="object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-medium">Change</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-1.5 text-[#0F2240]/40 group-hover:text-[#0F2240] transition-colors">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className="text-[10px] font-medium tracking-wide uppercase">Photo</span>
          </div>
        )}
      </button>
      {name && (
        <p className="text-sm text-[#0F2240]/50">
          {preview ? `${name}'s photo` : `Add a photo of ${name}`}
        </p>
      )}
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

function BreedSearch({
  selected,
  onAdd,
  onRemove,
}: {
  selected: { id: string; name: string; is_primary: boolean }[]
  onAdd: (breed: BreedResult, isPrimary: boolean) => void
  onRemove: (breedId: string) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BreedResult[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setSearched(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('breed')
      .select('id, name')
      .ilike('name', `%${q}%`)
      .limit(8)
    const rows: BreedResult[] = data ?? []
    if (/^(mutt|mix|mixed)$/i.test(q.trim())) {
      const { data: mb } = await supabase
        .from('breed')
        .select('id, name')
        .eq('name', 'Mixed Breed')
        .single()
      if (mb && !rows.find((r) => r.id === mb.id)) {
        rows.unshift(mb)
      }
    }
    setResults(rows)
    setSearched(true)
    setLoading(false)
  }, [supabase])

  const selectedIds = new Set(selected.map((b) => b.id))

  return (
    <div className="space-y-3">
      <div className="relative">
        <Input
          placeholder="Search breeds…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            search(e.target.value)
          }}
          className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] bg-white"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-[#0F2240]/20 border-t-[#0F2240] rounded-full animate-spin" />
          </div>
        )}
        {searched && !loading && results.length === 0 && query.length >= 2 && (
          <div className="absolute z-10 top-full mt-1 w-full bg-white border border-[#0F2240]/10 rounded-lg shadow-lg px-3 py-2.5 text-sm text-[#0F2240]/40">
            No breeds found
          </div>
        )}
        {results.length > 0 && (
          <div className="absolute z-10 top-full mt-1 w-full bg-white border border-[#0F2240]/10 rounded-lg shadow-lg overflow-hidden">
            {results.map((breed) => (
              <button
                key={breed.id}
                type="button"
                disabled={selectedIds.has(breed.id)}
                onClick={() => {
                  onAdd(breed, selected.length === 0)
                  setQuery('')
                  setResults([])
                }}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-[#F7F3EE] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between"
              >
                <span className="text-[#0F2240]">{breed.name}</span>
                {selectedIds.has(breed.id) && (
                  <span className="text-xs text-[#0F2240]/40">Added</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((breed, i) => (
            <span
              key={breed.id}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-[#0F2240] text-white"
            >
              {breed.name}
              {i === 0 && selected.length > 1 && (
                <span className="text-[10px] opacity-60 ml-0.5">primary</span>
              )}
              <button
                type="button"
                onClick={() => onRemove(breed.id)}
                className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 2l8 8M10 2l-8 8" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {selected.length === 0 && (
        <p className="text-xs text-[#0F2240]/40">
          Type to search. Add multiple breeds for a mix — first added is primary.
        </p>
      )}
    </div>
  )
}

function TagSelector({
  tags,
  selected,
  onToggle,
  colorClass = 'bg-[#0F2240] text-white',
  emptyClass = 'bg-[#F7F3EE] text-[#0F2240] hover:bg-[#EDE3D6]',
}: {
  tags: string[]
  selected: string[]
  onToggle: (tag: string) => void
  colorClass?: string
  emptyClass?: string
}) {
  const selectedSet = new Set(selected)
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => onToggle(tag)}
          className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
            selectedSet.has(tag) ? colorClass : emptyClass
          }`}
        >
          {tag}
        </button>
      ))}
    </div>
  )
}

export default function NewDogPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdDogId, setCreatedDogId] = useState<string | null>(null)
  const [humanProfile, setHumanProfile] = useState<{ display_name: string | null; avatar: string | null; username: string | null } | null>(null)
  const [allDogs, setAllDogs] = useState<{ id: string; name: string; avatar: string | null }[]>([])

  // Dogs created during onboarding that still need breed/details filled in
  const [pendingDogs, setPendingDogs] = useState<{ id: string; name: string; avatar: string | null }[]>([])
  // ID of the dog we're currently editing (null = creating a brand new dog)
  const [existingDogId, setExistingDogId] = useState<string | null>(null)

  const [form, setForm] = useState<FormData>({
    name: '',
    avatar: null,
    avatarPreview: null,
    breeds: [],
    mixDescription: '',
    birthday: '',
    size: '',
    sex: 'unknown',
    bio: '',
    personalityTags: [],
    allergies: [],
    allergyInput: '',
    isPrivate: false,
  })

  // On mount: find dogs created during onboarding that have no breed set yet
  useEffect(() => {
    async function loadPendingDogs() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: dogs } = await supabase
        .from('dog')
        .select('id, name, avatar, dog_breeds(breed_id)')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })

      if (!dogs) return

      const pending = (dogs as unknown as { id: string; name: string; avatar: string | null; dog_breeds: { breed_id: string }[] }[])
        .filter((d) => d.dog_breeds.length === 0)
        .map((d) => ({ id: d.id, name: d.name, avatar: d.avatar }))

      if (pending.length > 0) {
        setPendingDogs(pending)
        setExistingDogId(pending[0].id)
        setForm((prev) => ({
          ...prev,
          name: pending[0].name,
          avatarPreview: pending[0].avatar,
        }))
      }
    }
    loadPendingDogs()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const update = (patch: Partial<FormData>) =>
    setForm((prev) => ({ ...prev, ...patch }))

  const handleAvatarChange = (file: File) => {
    const preview = URL.createObjectURL(file)
    update({ avatar: file, avatarPreview: preview })
  }

  const togglePersonalityTag = (tag: string) => {
    update({
      personalityTags: form.personalityTags.includes(tag)
        ? form.personalityTags.filter((t) => t !== tag)
        : [...form.personalityTags, tag],
    })
  }

  const toggleAllergy = (tag: string) => {
    if (tag === 'None') {
      // Selecting None clears everything else
      update({ allergies: form.allergies.includes('None') ? [] : ['None'] })
    } else {
      // Selecting any real allergy removes None
      const without = form.allergies.filter((t) => t !== 'None')
      update({
        allergies: without.includes(tag)
          ? without.filter((t) => t !== tag)
          : [...without, tag],
      })
    }
  }

  const addCustomAllergy = () => {
    const val = form.allergyInput.trim().toLowerCase()
    if (val && !form.allergies.includes(val)) {
      update({ allergies: [...form.allergies, val], allergyInput: '' })
    }
  }

  const addBreed = (breed: BreedResult, isPrimary: boolean) => {
    update({ breeds: [...form.breeds, { ...breed, is_primary: isPrimary }] })
  }

  const removeBreed = (breedId: string) => {
    const remaining = form.breeds.filter((b) => b.id !== breedId)
    if (remaining.length > 0) remaining[0].is_primary = true
    update({ breeds: remaining })
  }

  const canAdvance = () => {
    if (step === 0) return form.name.trim().length > 0
    return true
  }

  const next = () => { if (step < TOTAL_STEPS - 1) setStep((s) => s + 1) }
  const back = () => { if (step > 0) setStep((s) => s - 1) }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Upload new avatar file if selected; otherwise keep existing URL
      let avatarUrl: string | null = form.avatarPreview
      if (form.avatar) {
        const ext = form.avatar.name.split('.').pop()
        const path = `${user.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, form.avatar, { upsert: true })
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = urlData.publicUrl
      }

      const dogFields = {
        name: form.name.trim(),
        avatar: avatarUrl,
        birthday: form.birthday || null,
        size: form.size || null,
        sex: form.sex,
        bio: form.bio.trim() || null,
        allergies: form.allergies.length > 0 ? form.allergies : null,
        personality_tags: form.personalityTags.length > 0 ? form.personalityTags : null,
        mix_description: form.mixDescription.trim() || null,
        is_private: form.isPrivate,
      }

      let savedDogId: string

      if (existingDogId) {
        // Update the onboarding-created dog
        const { error: dogError } = await supabase
          .from('dog')
          .update(dogFields)
          .eq('id', existingDogId)
        if (dogError) throw dogError
        savedDogId = existingDogId
      } else {
        // Insert a brand new dog
        const { data: dog, error: dogError } = await supabase
          .from('dog')
          .insert({ owner_id: user.id, ...dogFields })
          .select('id')
          .single()
        if (dogError) throw dogError
        savedDogId = dog.id
      }

      if (form.breeds.length > 0) {
        const { error: breedError } = await supabase.from('dog_breeds').insert(
          form.breeds.map((b, i) => ({
            dog_id: savedDogId,
            breed_id: b.id,
            is_primary: i === 0,
          }))
        )
        if (breedError) throw breedError
      }

      // Check if there are more pending onboarding dogs to complete
      const remainingPending = pendingDogs.slice(1)
      if (remainingPending.length > 0) {
        // Advance to the next pending dog
        setPendingDogs(remainingPending)
        setExistingDogId(remainingPending[0].id)
        setStep(0)
        setForm({
          name: remainingPending[0].name,
          avatar: null,
          avatarPreview: remainingPending[0].avatar,
          breeds: [],
          mixDescription: '',
          birthday: '',
          size: '',
          sex: 'unknown',
          bio: '',
          personalityTags: [],
          allergies: [],
          allergyInput: '',
          isPrivate: false,
        })
        setSubmitting(false)
        return
      }

      // All done — show success screen
      const { data: human } = await supabase
        .from('human')
        .select('display_name, avatar, username')
        .eq('id', user.id)
        .single()
      setHumanProfile(human)

      const { data: dogs } = await supabase
        .from('dog')
        .select('id, name, avatar')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })
      setAllDogs(dogs ?? [])

      setCreatedDogId(savedDogId)
      setStep(TOTAL_STEPS - 1)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
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
        <div className="flex flex-col">

              {/* Pending-dog progress banner */}
              {pendingDogs.length > 1 && step < TOTAL_STEPS - 1 && (
                <div className="mb-4 px-3 py-2 rounded-lg bg-[#F7F3EE] text-[13px] text-[#0F2240]/70">
                  Setting up <span className="font-semibold text-[#0F2240]">{pendingDogs[0].name}</span>
                  {' · '}Next: <span className="font-semibold text-[#0F2240]">{pendingDogs[1].name}</span>
                </div>
              )}

              {/* Step header */}
              {step < TOTAL_STEPS - 1 && (
                <div className="flex items-center justify-between mb-6">
                  <div>
                    {step === 0 && (
                      <>
                        <h1 className="text-2xl font-bold">Tell us about your dog</h1>
                        <p className="text-sm text-muted-foreground mt-1">Start with the basics — you can always add more later.</p>
                      </>
                    )}
                    {step === 1 && (
                      <>
                        <h1 className="text-2xl font-bold">
                          {form.name ? `What's ${form.name} like?` : 'Personality'}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">Pick as many as fit. This helps personalize recommendations.</p>
                      </>
                    )}
                    {step === 2 && (
                      <>
                        <h1 className="text-2xl font-bold">Almost there</h1>
                        <p className="text-sm text-muted-foreground mt-1">A couple of last things.</p>
                      </>
                    )}
                  </div>
                  <StepIndicator current={step} total={TOTAL_STEPS - 1} />
                </div>
              )}

              {/* Step 0 — basics */}
              {step === 0 && (
                <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <AvatarUploader preview={form.avatarPreview} name={form.name} onChange={handleAvatarChange} />

                  <div className="space-y-1.5">
                    <Label className="text-[#0F2240] font-medium text-sm">Name <span className="text-[#C4855A]">*</span></Label>
                    <Input
                      placeholder="What's your dog's name?"
                      value={form.name}
                      onChange={(e) => update({ name: e.target.value })}
                      className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] bg-white text-[#0F2240]"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[#0F2240] font-medium text-sm">Breed</Label>
                    <BreedSearch selected={form.breeds} onAdd={addBreed} onRemove={removeBreed} />
                    {(form.breeds.length >= 2 || form.breeds.some((b) => b.name === 'Mixed Breed')) && (
                      <div className="pt-1 space-y-1">
                        <Input
                          placeholder="Mix composition (optional) — e.g. 50% Golden Retriever, 50% Poodle"
                          value={form.mixDescription}
                          onChange={(e) => update({ mixDescription: e.target.value })}
                          className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] bg-white text-[#0F2240] text-sm"
                        />
                        <p className="text-xs text-[#0F2240]/40">Optional — describe the mix breakdown.</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[#0F2240] font-medium text-sm">Birthday</Label>
                    <Input
                      type="date"
                      value={form.birthday}
                      onChange={(e) => update({ birthday: e.target.value })}
                      max={new Date().toISOString().split('T')[0]}
                      className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] bg-white text-[#0F2240]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[#0F2240] font-medium text-sm">Size</Label>
                    <div className="grid grid-cols-5 gap-2">
                      {SIZE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => update({ size: opt.value })}
                          className={`flex flex-col items-center py-3 px-1 rounded-xl border text-xs transition-all ${
                            form.size === opt.value
                              ? 'border-[#0F2240] bg-[#0F2240] text-white'
                              : 'border-[#0F2240]/20 bg-white text-[#0F2240] hover:border-[#0F2240]/50'
                          }`}
                        >
                          <span className="font-semibold text-sm">{opt.label}</span>
                          <span className={`text-[10px] mt-0.5 leading-tight text-center ${form.size === opt.value ? 'text-white/70' : 'text-[#0F2240]/40'}`}>
                            {opt.range}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[#0F2240] font-medium text-sm">Sex</Label>
                    <div className="flex gap-2">
                      {SEX_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => update({ sex: opt.value })}
                          className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                            form.sex === opt.value
                              ? 'border-[#0F2240] bg-[#0F2240] text-white'
                              : 'border-[#0F2240]/20 bg-white text-[#0F2240] hover:border-[#0F2240]/50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1 — personality */}
              {step === 1 && (
                <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="space-y-2.5">
                    <Label className="text-[#0F2240] font-medium text-sm">Personality</Label>
                    <TagSelector tags={PERSONALITY_TAGS} selected={form.personalityTags} onToggle={togglePersonalityTag} />
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-[#0F2240] font-medium text-sm">Allergies & sensitivities</Label>
                    <TagSelector
                      tags={COMMON_ALLERGIES}
                      selected={form.allergies}
                      onToggle={toggleAllergy}
                      colorClass="bg-[#C4855A] text-white"
                      emptyClass="bg-[#F7F3EE] text-[#0F2240] hover:bg-[#EDE3D6] border border-[#0F2240]/10"
                    />
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add another…"
                        value={form.allergyInput}
                        onChange={(e) => update({ allergyInput: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomAllergy() } }}
                        className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] bg-white text-sm"
                      />
                      <Button type="button" variant="outline" onClick={addCustomAllergy} className="border-[#0F2240]/20 text-[#0F2240] hover:bg-[#EDE3D6] shrink-0">
                        Add
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[#0F2240] font-medium text-sm">Bio</Label>
                    <Textarea
                      placeholder={`Tell the community about ${form.name || 'your dog'}…`}
                      value={form.bio}
                      onChange={(e) => update({ bio: e.target.value })}
                      rows={3}
                      maxLength={300}
                      className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] bg-white resize-none text-[#0F2240]"
                    />
                    <p className="text-xs text-[#0F2240]/40 text-right">{form.bio.length}/300</p>
                  </div>
                </div>
              )}

              {/* Step 2 — privacy */}
              {step === 2 && (
                <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-[#F7F3EE] border border-[#0F2240]/10">
                    <div>
                      <p className="text-sm font-medium text-[#0F2240]">Private profile</p>
                      <p className="text-xs text-[#0F2240]/50 mt-0.5">
                        Only approved followers can see {form.name ? `${form.name}'s` : 'this'} posts and activity.
                      </p>
                    </div>
                    <Switch
                      checked={form.isPrivate}
                      onCheckedChange={(v) => update({ isPrivate: v })}
                      className="data-[state=checked]:bg-[#0F2240] shrink-0"
                    />
                  </div>

                  {error && (
                    <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3 — success */}
              {step === TOTAL_STEPS - 1 && createdDogId && (
                <div className="flex flex-col items-center justify-center flex-1 gap-6 py-8 text-center animate-in fade-in zoom-in-95 duration-500">
                  {/* Avatars: human + all dogs */}
                  <div className="flex items-center gap-3 flex-wrap justify-center">
                    <div className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg bg-[#EDE3D6] flex items-center justify-center shrink-0">
                      {humanProfile?.avatar ? (
                        <Image src={humanProfile.avatar} alt={humanProfile.display_name ?? 'You'} fill className="object-cover" />
                      ) : (
                        <span className="text-3xl">🧑</span>
                      )}
                    </div>
                    {allDogs.map((dog) => (
                      <React.Fragment key={dog.id}>
                        <span className="text-2xl font-bold text-[#0F2240]/30">+</span>
                        <div className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg bg-[#EDE3D6] flex items-center justify-center shrink-0">
                          {dog.avatar ? (
                            <Image src={dog.avatar} alt={dog.name} fill className="object-cover" />
                          ) : (
                            <span className="text-3xl">🐾</span>
                          )}
                        </div>
                      </React.Fragment>
                    ))}
                  </div>

                  <div>
                    <h1 className="text-2xl font-bold text-[#0F2240]">
                      {(() => {
                        const owner = humanProfile?.display_name ?? 'You'
                        if (allDogs.length === 0) return `${owner} & ${form.name} are on Dogish`
                        if (allDogs.length === 1) return `${owner} & ${allDogs[0].name} are on Dogish`
                        const dogNames = allDogs.map((d) => d.name)
                        const last = dogNames.pop()
                        return `${owner}, ${dogNames.join(', ')} & ${last} are on Dogish`
                      })()}
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm max-w-xs mx-auto">
                      Time to share some posts, find your kit, and discover the best spots in your city.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 w-full">
                    <Button
                      onClick={() => router.push('/discover')}
                      style={{ backgroundColor: '#0F2240' }}
                      className="text-white h-10 text-sm font-medium w-full"
                    >
                      Find your pack
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => humanProfile?.username ? router.push(`/${humanProfile.username}/${form.name.toLowerCase()}`) : router.push('/')}
                      className="border-[#0F2240]/20 text-[#0F2240] hover:bg-[#EDE3D6] h-10 text-sm w-full"
                    >
                      View your profile
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setStep(0)
                        setCreatedDogId(null)
                        setHumanProfile(null)
                        setAllDogs([])
                        setError(null)
                        setForm({
                          name: '',
                          avatar: null,
                          avatarPreview: null,
                          breeds: [],
                          mixDescription: '',
                          birthday: '',
                          size: '',
                          sex: 'unknown',
                          bio: '',
                          personalityTags: [],
                          allergies: [],
                          allergyInput: '',
                          isPrivate: false,
                        })
                      }}
                      className="text-sm text-[#0F2240]/40 hover:text-[#0F2240] transition-colors underline-offset-2 hover:underline"
                    >
                      Add another dog
                    </button>
                  </div>
                </div>
              )}

              {/* Nav buttons */}
              {step < TOTAL_STEPS - 1 && (
                <div className="mt-auto pt-6 flex gap-3">
                  {step > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={back}
                      className="border-[#0F2240]/20 text-[#0F2240] hover:bg-[#EDE3D6] flex-1"
                    >
                      Back
                    </Button>
                  )}
                  {step < TOTAL_STEPS - 2 ? (
                    <Button
                      type="button"
                      onClick={next}
                      disabled={!canAdvance()}
                      style={{ backgroundColor: '#0F2240' }}
                      className="text-white flex-1 disabled:opacity-40"
                    >
                      Continue
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting}
                      style={{ backgroundColor: '#0F2240' }}
                      className="text-white flex-1 disabled:opacity-40"
                    >
                      {submitting ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Creating profile…
                        </span>
                      ) : (
                        `Create ${form.name || 'profile'}`
                      )}
                    </Button>
                  )}
                </div>
              )}
        </div>
      </div>
    </div>
  )
}
