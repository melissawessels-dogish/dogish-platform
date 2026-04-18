'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

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
  isPrivate: boolean
}

const PERSONALITY_TAGS = [
  'cuddler', 'friendly', 'playful', 'adventurer', 'zoomies',
  'ball-obsessed', 'water-loving', 'foodie', 'social butterfly', 'velcro',
  'curious', 'calm', 'protector', 'independent', 'couch potato',
  'moody', 'anxious', 'fierce', 'stubborn', 'vocal',
  'dramatic', 'selective', 'suspicious', 'sensitive', 'mischievous', 'extra',
]

const COMMON_ALLERGIES = [
  'none', 'chicken', 'beef', 'wheat', 'corn', 'soy',
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
    const { data } = await supabase.from('breed').select('id, name').ilike('name', `%${q}%`).limit(8)
    const rows: BreedResult[] = data ?? []
    if (/^(mutt|mix|mixed)$/i.test(q.trim())) {
      const { data: mb } = await supabase.from('breed').select('id, name').eq('name', 'Mixed Breed').single()
      if (mb && !rows.find((r) => r.id === mb.id)) rows.unshift(mb)
    }
    setResults(rows)
    setSearched(true)
    setLoading(false)
  }, [supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedIds = new Set(selected.map((b) => b.id))

  return (
    <div className="space-y-3">
      <div className="relative">
        <Input
          placeholder="Search breeds…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); search(e.target.value) }}
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
                onClick={() => { onAdd(breed, selected.length === 0); setQuery(''); setResults([]) }}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-[#F7F3EE] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between"
              >
                <span className="text-[#0F2240]">{breed.name}</span>
                {selectedIds.has(breed.id) && <span className="text-xs text-[#0F2240]/40">Added</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((breed, i) => (
            <span key={breed.id} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-[#0F2240] text-white">
              {breed.name}
              {i === 0 && selected.length > 1 && <span className="text-[10px] opacity-60 ml-0.5">primary</span>}
              <button type="button" onClick={() => onRemove(breed.id)} className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 2l8 8M10 2l-8 8" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
      {selected.length === 0 && (
        <p className="text-xs text-[#0F2240]/40">Type to search. Add multiple breeds for a mix — first added is primary.</p>
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
          className={`px-3 py-1.5 rounded-full text-sm transition-colors ${selectedSet.has(tag) ? colorClass : emptyClass}`}
        >
          {tag.toLowerCase() === 'none' ? 'No known allergies' : tag}
        </button>
      ))}
    </div>
  )
}

export default function EditDogPage() {
  const params = useParams<{ username: string; dogname: string }>()
  const { username, dogname } = params
  const router = useRouter()
  const supabase = createClient()

  const [dogId, setDogId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<FormData>({
    name: '',
    avatarFile: null,
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

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      // Resolve owner
      const { data: owner } = await supabase
        .from('human')
        .select('id')
        .eq('username', username)
        .maybeSingle()
      if (!owner) { router.replace('/'); return }

      // Find dog
      const { data: dogRows } = await supabase
        .from('dog')
        .select(`id, name, avatar, bio, size, sex, birthday, personality_tags, allergies, mix_description, is_private, owner_id,
          dog_breeds(is_primary, breed:breed_id(id, name))`)
        .eq('owner_id', owner.id)
        .ilike('name', dogname)
        .limit(1)

      const dog = dogRows?.[0] as {
        id: string; name: string; avatar: string | null; bio: string | null
        size: string | null; sex: string; birthday: string | null
        personality_tags: string[] | null; allergies: string[] | null
        mix_description: string | null; is_private: boolean; owner_id: string
        dog_breeds: { is_primary: boolean; breed: { id: string; name: string } | null }[]
      } | undefined

      if (!dog) { router.replace('/'); return }

      // Only owner can edit
      if (dog.owner_id !== user.id) { router.replace(`/${username}/${dogname}`); return }

      const existingBreeds = (dog.dog_breeds ?? [])
        .filter((b) => b.breed !== null)
        .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
        .map((b) => ({ id: b.breed!.id, name: b.breed!.name, is_primary: b.is_primary }))

      setDogId(dog.id)
      setForm({
        name: dog.name,
        avatarFile: null,
        avatarPreview: dog.avatar,
        breeds: existingBreeds,
        mixDescription: dog.mix_description ?? '',
        birthday: dog.birthday ?? '',
        size: (dog.size as DogSize | null) ?? '',
        sex: (dog.sex as DogSex) ?? 'unknown',
        bio: dog.bio ?? '',
        personalityTags: dog.personality_tags ?? [],
        allergies: dog.allergies ?? [],
        allergyInput: '',
        isPrivate: dog.is_private,
      })
      setLoaded(true)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const update = (patch: Partial<FormData>) => setForm((prev) => ({ ...prev, ...patch }))

  const togglePersonalityTag = (tag: string) =>
    update({ personalityTags: form.personalityTags.includes(tag) ? form.personalityTags.filter((t) => t !== tag) : [...form.personalityTags, tag] })

  const toggleAllergy = (tag: string) => {
    if (tag === 'none') {
      update({ allergies: form.allergies.includes('none') ? [] : ['none'] })
    } else {
      const without = form.allergies.filter((t) => t !== 'none')
      update({ allergies: without.includes(tag) ? without.filter((t) => t !== tag) : [...without, tag] })
    }
  }

  const addCustomAllergy = () => {
    const val = form.allergyInput.trim().toLowerCase()
    if (val && !form.allergies.includes(val)) update({ allergies: [...form.allergies, val], allergyInput: '' })
  }

  const addBreed = (breed: BreedResult, isPrimary: boolean) =>
    update({ breeds: [...form.breeds, { ...breed, is_primary: isPrimary }] })

  const removeBreed = (breedId: string) => {
    const remaining = form.breeds.filter((b) => b.id !== breedId)
    if (remaining.length > 0) remaining[0].is_primary = true
    update({ breeds: remaining })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dogId) return
    setSubmitting(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let avatarUrl: string | null = form.avatarPreview
      if (form.avatarFile) {
        const ext = form.avatarFile.name.split('.').pop()
        const path = `${user.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('avatars').upload(path, form.avatarFile, { upsert: true })
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = urlData.publicUrl
      }

      const { error: dogError } = await supabase.from('dog').update({
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
      }).eq('id', dogId)
      if (dogError) throw dogError

      // Replace all breeds: delete then insert
      await supabase.from('dog_breeds').delete().eq('dog_id', dogId)
      if (form.breeds.length > 0) {
        const { error: breedError } = await supabase.from('dog_breeds').insert(
          form.breeds.map((b, i) => ({ dog_id: dogId, breed_id: b.id, is_primary: i === 0 }))
        )
        if (breedError) throw breedError
      }

      router.push(`/${username}/${form.name.trim().toLowerCase()}`)
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
    <div className="min-h-svh bg-white pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">

        {/* Back link */}
        <Link
          href={`/${username}/${dogname}`}
          className="inline-flex items-center gap-1.5 text-[13px] text-[#0F2240]/50 hover:text-[#0F2240] transition-colors mb-6"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to {form.name}
        </Link>

        <h1 className="text-2xl font-bold text-[#0F2240] mb-6">Edit {form.name}</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {/* Avatar */}
          <AvatarUploader
            preview={form.avatarPreview}
            name={form.name}
            onChange={(file) => update({ avatarFile: file, avatarPreview: URL.createObjectURL(file) })}
          />

          {/* Name */}
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

          {/* Breed */}
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

          {/* Birthday */}
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

          {/* Size */}
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

          {/* Sex */}
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

          {/* Personality */}
          <div className="space-y-2.5">
            <Label className="text-[#0F2240] font-medium text-sm">Personality</Label>
            <TagSelector tags={PERSONALITY_TAGS} selected={form.personalityTags} onToggle={togglePersonalityTag} />
          </div>

          {/* Allergies */}
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

          {/* Bio */}
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

          {/* Private */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={form.isPrivate}
              onChange={(e) => update({ isPrivate: e.target.checked })}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#0F2240]/30 accent-[#0F2240] cursor-pointer"
            />
            <div>
              <p className="text-sm font-medium text-[#0F2240]">Private profile</p>
              <p className="text-xs text-[#0F2240]/50 mt-0.5">Only your followers can see this dog's profile.</p>
            </div>
          </label>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={!form.name.trim() || submitting}
            style={{ backgroundColor: '#0F2240' }}
            className="text-white w-full disabled:opacity-40"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </span>
            ) : (
              'Save changes'
            )}
          </Button>

        </form>
      </div>
    </div>
  )
}
