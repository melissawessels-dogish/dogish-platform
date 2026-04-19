'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
  avatarFile: File | null
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
  diet: string[]
  isPrivate: boolean
  allergiesPublic: boolean
  dietPublic: boolean
  isFixed: 'fixed' | 'intact' | null
  energyLevel: string
  activities: string[]
  healthConditions: string[]
  vetName: string
  hasInsurance: boolean
  insuranceProvider: string
  location: string
  foodBrand: string
}

const PERSONALITY_TAGS = [
  'cuddler', 'friendly', 'playful', 'adventurer', 'zoomies',
  'ball-obsessed', 'water-loving', 'foodie', 'social butterfly', 'velcro',
  'curious', 'calm', 'protector', 'independent', 'couch potato',
  'moody', 'anxious', 'fierce', 'stubborn', 'vocal',
  'dramatic', 'selective', 'suspicious', 'sensitive', 'mischievous', 'extra',
]

const COMMON_ALLERGIES = [
  'chicken', 'beef', 'wheat', 'corn', 'soy',
  'dairy', 'eggs', 'fish', 'lamb', 'pork',
]

const DIET_OPTIONS = [
  'kibble',
  'canned',
  'fresh/gently-cooked (commercial)',
  'dehydrated/freeze-dried',
  'raw',
  'home-cooked',
  'mixed/combination',
]

const ENERGY_LEVELS = ['low', 'moderate', 'high', 'very high']

const ACTIVITY_OPTIONS = [
  'hiking', 'swimming', 'fetch', 'agility', 'running',
  'dog parks', 'cuddling', 'training',
]

const HEALTH_CONDITION_OPTIONS = [
  'anxiety', 'arthritis', 'cancer', 'diabetes',
  'epilepsy', 'heart disease', 'hip dysplasia', 'hypothyroidism',
  'IBD', 'kidney disease', 'luxating patella',
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

const TOTAL_STEPS = 2

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

function emptyForm(name = '', avatarPreview: string | null = null): FormData {
  return {
    name,
    avatarFile: null,
    avatarPreview,
    breeds: [],
    mixDescription: '',
    birthday: '',
    size: '',
    sex: 'unknown',
    bio: '',
    personalityTags: [],
    allergies: [],
    allergyInput: '',
    diet: [],
    isPrivate: false,
    allergiesPublic: true,
    dietPublic: true,
    isFixed: null,
    energyLevel: '',
    activities: [],
    healthConditions: [],
    vetName: '',
    hasInsurance: false,
    insuranceProvider: '',
    location: '',
    foodBrand: '',
  }
}

export default function OnboardingDogsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  // List of dogs still needing details. Index 0 is the one we're currently editing.
  const [pendingDogs, setPendingDogs] = useState<{ id: string; name: string; avatar: string | null }[]>([])
  const [form, setForm] = useState<FormData>(emptyForm())

  useEffect(() => {
    async function loadPendingDogs() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: dogs } = await supabase
        .from('dog')
        .select('id, name, avatar, dog_breeds(breed_id)')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })

      const pending = ((dogs ?? []) as unknown as { id: string; name: string; avatar: string | null; dog_breeds: { breed_id: string }[] }[])
        .filter((d) => d.dog_breeds.length === 0)
        .map((d) => ({ id: d.id, name: d.name, avatar: d.avatar }))

      if (pending.length === 0) {
        router.replace('/home')
        return
      }

      setPendingDogs(pending)
      setForm(emptyForm(pending[0].name, pending[0].avatar))
      setLoaded(true)
    }
    loadPendingDogs()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const update = (patch: Partial<FormData>) =>
    setForm((prev) => ({ ...prev, ...patch }))

  const togglePersonalityTag = (tag: string) => {
    update({
      personalityTags: form.personalityTags.includes(tag)
        ? form.personalityTags.filter((t) => t !== tag)
        : [...form.personalityTags, tag],
    })
  }

  const toggleAllergy = (tag: string) =>
    update({ allergies: form.allergies.includes(tag) ? form.allergies.filter((t) => t !== tag) : [...form.allergies, tag] })

  const toggleDiet = (tag: string) =>
    update({ diet: form.diet.includes(tag) ? form.diet.filter((t) => t !== tag) : [...form.diet, tag] })

  const toggleActivity = (tag: string) =>
    update({ activities: form.activities.includes(tag) ? form.activities.filter((t) => t !== tag) : [...form.activities, tag] })

  const toggleHealthCondition = (tag: string) =>
    update({ healthConditions: form.healthConditions.includes(tag) ? form.healthConditions.filter((t) => t !== tag) : [...form.healthConditions, tag] })

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

  const next = () => { if (step < TOTAL_STEPS - 1) setStep((s) => s + 1) }
  const back = () => { if (step > 0) setStep((s) => s - 1) }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const currentDog = pendingDogs[0]

      // Upload new avatar file if selected; otherwise keep existing URL
      let avatarUrl: string | null = form.avatarPreview
      if (form.avatarFile) {
        const ext = form.avatarFile.name.split('.').pop()
        const path = `${user.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, form.avatarFile, { upsert: true })
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
        diet: form.diet.length > 0 ? form.diet : null,
        mix_description: form.mixDescription.trim() || null,
        is_private: form.isPrivate,
        allergies_public: form.allergiesPublic,
        diet_public: form.dietPublic,
        is_fixed: form.isFixed === 'fixed' ? true : form.isFixed === 'intact' ? false : null,
        energy_level: form.energyLevel || null,
        activities: form.activities.length > 0 ? form.activities : null,
        health_conditions: form.healthConditions.length > 0 ? form.healthConditions : null,
        vet_name: form.vetName.trim() || null,
        has_insurance: form.hasInsurance,
        insurance_provider: form.hasInsurance && form.insuranceProvider.trim() ? form.insuranceProvider.trim() : null,
        location: form.location.trim() || null,
        food_brand: form.foodBrand.trim() || null,
      }

      const { error: dogError } = await supabase
        .from('dog')
        .update(dogFields)
        .eq('id', currentDog.id)
      if (dogError) throw dogError

      if (form.breeds.length > 0) {
        const { error: breedError } = await supabase.from('dog_breeds').insert(
          form.breeds.map((b, i) => ({
            dog_id: currentDog.id,
            breed_id: b.id,
            is_primary: i === 0,
          }))
        )
        if (breedError) throw breedError
      }

      const remaining = pendingDogs.slice(1)
      if (remaining.length > 0) {
        setPendingDogs(remaining)
        setStep(0)
        setForm(emptyForm(remaining[0].name, remaining[0].avatar))
        setSubmitting(false)
        return
      }

      router.push('/home')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  if (!loaded) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-white">
        <div className="w-6 h-6 border-2 border-[#0F2240]/20 border-t-[#0F2240] rounded-full animate-spin" />
      </div>
    )
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

          {/* Multi-dog progress banner */}
          {pendingDogs.length > 1 && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-[#F7F3EE] text-[13px] text-[#0F2240]/70">
              Setting up <span className="font-semibold text-[#0F2240]">{pendingDogs[0].name}</span>
              {' · '}Next: <span className="font-semibold text-[#0F2240]">{pendingDogs[1].name}</span>
            </div>
          )}

          {/* Back to profile — step 0 only */}
          {step === 0 && (
            <Link
              href="/onboarding/profile"
              className="inline-flex items-center gap-1.5 text-[13px] text-[#0F2240]/50 hover:text-[#0F2240] transition-colors mb-4"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              Back
            </Link>
          )}

          {/* Step header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              {step === 0 && (
                <>
                  <h1 className="text-2xl font-bold">Tell us about {form.name || 'your dog'}</h1>
                  <p className="text-sm text-muted-foreground mt-1">Start with the basics — you can always add more later.</p>
                </>
              )}
              {step === 1 && (
                <>
                  <h1 className="text-2xl font-bold">
                    {form.name ? `What's ${form.name} like?` : 'Personality'}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">Pick as many as fit.</p>
                </>
              )}

            </div>
            <StepIndicator current={step} total={TOTAL_STEPS} />
          </div>

          {/* Step 0 — identity + physical */}
          {step === 0 && (
            <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <AvatarUploader preview={form.avatarPreview} name={form.name} onChange={(file) => {
                const preview = URL.createObjectURL(file)
                update({ avatarFile: file, avatarPreview: preview })
              }} />

              <div className="space-y-1.5">
                <Label className="text-[#0F2240] font-medium text-sm">Name <span className="text-[#C4855A]">*</span></Label>
                <Input
                  placeholder="What's your dog's name?"
                  value={form.name}
                  onChange={(e) => update({ name: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}
                  className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] bg-white text-[#0F2240]"
                />
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

              <div className="space-y-1.5">
                <Label className="text-[#0F2240] font-medium text-sm">Breed</Label>
                <BreedSearch selected={form.breeds} onAdd={addBreed} onRemove={removeBreed} />
                {(form.breeds.length >= 2 || form.breeds.some((b) => b.name === 'Mixed Breed')) && (
                  <div className="pt-1 space-y-1">
                    <Input
                      placeholder="Mix composition (optional) — e.g. 50% Golden Retriever, 50% Poodle"
                      value={form.mixDescription}
                      onChange={(e) => update({ mixDescription: e.target.value })}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}
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
                <Label className="text-[#0F2240] font-medium text-sm">Location</Label>
                <Input
                  placeholder="City, State"
                  value={form.location}
                  onChange={(e) => update({ location: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}
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

              <div className="space-y-1.5">
                <Label className="text-[#0F2240] font-medium text-sm">Spayed / Neutered</Label>
                <div className="flex gap-2">
                  {(['fixed', 'intact'] as const).map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => update({ isFixed: form.isFixed === val ? null : val })}
                      className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        form.isFixed === val
                          ? 'border-[#0F2240] bg-[#0F2240] text-white'
                          : 'border-[#0F2240]/20 bg-white text-[#0F2240] hover:border-[#0F2240]/50'
                      }`}
                    >
                      {val === 'fixed' ? 'Spayed / Neutered' : 'Intact'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 1 — personality, health, practical */}
          {step === 1 && (
            <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="space-y-2.5">
                <Label className="text-[#0F2240] font-medium text-sm">Personality</Label>
                <TagSelector tags={PERSONALITY_TAGS} selected={form.personalityTags} onToggle={togglePersonalityTag} />
              </div>

              {/* Energy level */}
              <div className="space-y-2.5">
                <Label className="text-[#0F2240] font-medium text-sm">Energy level</Label>
                <div className="flex flex-wrap gap-2">
                  {ENERGY_LEVELS.map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => update({ energyLevel: form.energyLevel === level ? '' : level })}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        form.energyLevel === level
                          ? 'bg-[#0F2240] text-white'
                          : 'bg-[#F7F3EE] text-[#0F2240] hover:bg-[#EDE3D6]'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Activities */}
              <div className="space-y-2.5">
                <Label className="text-[#0F2240] font-medium text-sm">Activities</Label>
                <TagSelector tags={ACTIVITY_OPTIONS} selected={form.activities} onToggle={toggleActivity} />
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
                <div className="flex items-center justify-between pt-1">
                  <Label className="text-sm text-[#0F2240]/70 font-normal">Share allergies on profile</Label>
                  <Switch
                    checked={form.allergiesPublic}
                    onCheckedChange={(v) => update({ allergiesPublic: v })}
                    className="data-[state=checked]:bg-[#0F2240]"
                  />
                </div>
              </div>

              {/* Health conditions */}
              <div className="space-y-2.5">
                <Label className="text-[#0F2240] font-medium text-sm">Health conditions</Label>
                <TagSelector tags={HEALTH_CONDITION_OPTIONS} selected={form.healthConditions} onToggle={toggleHealthCondition} />
              </div>

              <div className="space-y-2.5">
                <Label className="text-[#0F2240] font-medium text-sm">Diet</Label>
                <TagSelector
                  tags={DIET_OPTIONS}
                  selected={form.diet}
                  onToggle={toggleDiet}
                />
                <div className="flex items-center justify-between pt-1">
                  <Label className="text-sm text-[#0F2240]/70 font-normal">Share diet on profile</Label>
                  <Switch
                    checked={form.dietPublic}
                    onCheckedChange={(v) => update({ dietPublic: v })}
                    className="data-[state=checked]:bg-[#0F2240]"
                  />
                </div>
              </div>

              {/* Food brand */}
              <div className="space-y-1.5">
                <Label className="text-[#0F2240] font-medium text-sm">Food brand</Label>
                <Input
                  value={form.foodBrand}
                  onChange={(e) => update({ foodBrand: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}
                  className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] bg-white text-[#0F2240]"
                />
              </div>

              {/* Vet */}
              <div className="space-y-1.5">
                <Label className="text-[#0F2240] font-medium text-sm">Vet / practice name</Label>
                <Input
                  value={form.vetName}
                  onChange={(e) => update({ vetName: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}
                  className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] bg-white text-[#0F2240]"
                />
              </div>

              {/* Insurance */}
              <div className="space-y-2.5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.hasInsurance}
                    onChange={(e) => update({ hasInsurance: e.target.checked })}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#0F2240]/30 accent-[#0F2240] cursor-pointer"
                  />
                  <p className="text-sm font-medium text-[#0F2240]">Has pet insurance</p>
                </label>
                {form.hasInsurance && (
                  <Input
                    placeholder="Insurance provider"
                    value={form.insuranceProvider}
                    onChange={(e) => update({ insuranceProvider: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}
                    className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] bg-white text-[#0F2240]"
                  />
                )}
              </div>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={form.isPrivate}
                  onChange={(e) => update({ isPrivate: e.target.checked })}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#0F2240]/30 accent-[#0F2240] cursor-pointer"
                />
                <div>
                  <p className="text-sm font-medium text-[#0F2240] group-hover:text-[#0F2240] transition-colors">Private profile</p>
                  <p className="text-xs text-[#0F2240]/50 mt-0.5">Only your followers can see this dog's profile.</p>
                </div>
              </label>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Nav buttons */}
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
            {step < TOTAL_STEPS - 1 ? (
              <Button
                type="button"
                onClick={next}
                disabled={!form.name.trim()}
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
                    Saving…
                  </span>
                ) : (
                  pendingDogs.length > 1 ? `Save & next` : `Save & continue`
                )}
              </Button>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
