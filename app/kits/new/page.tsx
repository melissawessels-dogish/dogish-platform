'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'

const KIT_TYPES = [
  { value: 'food', label: 'Food & Treats' },
  { value: 'gear', label: 'Gear & Accessories' },
  { value: 'health', label: 'Health & Wellness' },
  { value: 'places', label: 'Places & Trails' },
  { value: 'grooming', label: 'Grooming' },
  { value: 'favorites', label: 'Favorites' },
] as const

type KitTypeValue = typeof KIT_TYPES[number]['value']

function getDescriptionPlaceholder(type: KitTypeValue | null, name: string | null): string {
  const n = name ?? 'your dog'
  switch (type) {
    case 'food':      return `e.g. The kibble ${n} eats, favorite treats, supplements ${n} takes daily`
    case 'gear':      return `e.g. ${n}'s harness, leash, favorite toys, bed`
    case 'health':    return `e.g. ${n}'s vet, medications, supplements, groomer`
    case 'places':    return `e.g. Our favorite parks, trails, and dog-friendly spots`
    case 'grooming':  return `e.g. ${n}'s groomer, shampoo, brush, nail care routine`
    case 'favorites': return `e.g. Anything and everything ${n} loves`
    default:          return "What's this kit about?"
  }
}

export default function NewKitPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const dogId = searchParams.get('dog')

  const [dogName, setDogName] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<KitTypeValue | null>(null)
  const [title, setTitle] = useState('')
  const [titleManuallyEdited, setTitleManuallyEdited] = useState(false)
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cancelHref, setCancelHref] = useState('/')

  useEffect(() => {
    async function loadContext() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: human } = await supabase
        .from('human')
        .select('username')
        .eq('id', user.id)
        .maybeSingle()

      const username = human?.username ?? null

      if (dogId) {
        const { data: dog } = await supabase
          .from('dog')
          .select('name')
          .eq('id', dogId)
          .maybeSingle()

        if (dog) {
          setDogName(dog.name)
          if (username) setCancelHref(`/${username}/${dog.name.toLowerCase()}`)
        }
      } else {
        if (username) setCancelHref(`/${username}`)
      }
    }

    loadContext()
  }, [dogId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTypeSelect = (type: KitTypeValue) => {
    const next = selectedType === type ? null : type
    setSelectedType(next)

    // Only auto-fill title if user hasn't manually edited it
    if (!titleManuallyEdited) {
      if (next) {
        const typeLabel = KIT_TYPES.find((t) => t.value === next)!.label
        setTitle(dogName ? `${dogName}'s ${typeLabel}` : typeLabel)
      } else {
        setTitle('')
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error: insertError } = await supabase
        .from('kit')
        .insert({
          owner_id: user.id,
          dog_id: dogId ?? null,
          name: title.trim(),
          category: selectedType ?? null,
          description: description.trim() || null,
          is_public: !isPrivate,
        })

      if (insertError) throw insertError

      router.push(cancelHref)
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
          <h1 className="text-2xl font-bold">Create a kit</h1>
          <p className="text-sm text-muted-foreground">
            {dogId && dogName
              ? `Curate what matters to ${dogName}`
              : 'Curate what matters to your pack'}
          </p>
        </div>

        {dogId && dogName && (
          <div className="mb-6 px-4 py-2.5 rounded-xl bg-[#F7F3EE] border border-[#0F2240]/10 text-sm text-[#0F2240]/70 text-center">
            Creating a kit for <span className="font-semibold text-[#0F2240]">{dogName}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Kit type selector */}
          <div className="space-y-2">
            <Label className="text-[#0F2240] font-medium text-sm">Kit type <span className="text-[#0F2240]/40 font-normal">(optional)</span></Label>
            <div className="grid grid-cols-3 gap-2">
              {KIT_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleTypeSelect(type.value)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-medium transition-all ${
                    selectedType === type.value
                      ? 'border-[#0F2240] bg-[#0F2240] text-white'
                      : 'border-[#0F2240]/15 bg-white text-[#0F2240] hover:border-[#0F2240]/40 hover:bg-[#F7F3EE]'
                  }`}
                >
                  <span className="leading-tight text-center">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-[#0F2240] font-medium text-sm">
              Title <span className="text-[#C4855A]">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setTitleManuallyEdited(true)
              }}
              placeholder={dogName ? `e.g. ${dogName}'s Food, Favorite Trails` : 'e.g. Favorite Trails, Go-to Gear'}
              required
              className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] text-[#0F2240]"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-[#0F2240] font-medium text-sm">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={getDescriptionPlaceholder(selectedType, dogName)}
              rows={3}
              maxLength={300}
              className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] text-[#0F2240] resize-none"
            />
            <p className="text-xs text-[#0F2240]/40 text-right">{description.length}/300</p>
          </div>

          {/* Privacy */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-[#F7F3EE] border border-[#0F2240]/10">
            <div>
              <p className="text-sm font-medium text-[#0F2240]">Private kit</p>
              <p className="text-xs text-[#0F2240]/50 mt-0.5">Only you can see this kit.</p>
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
            disabled={submitting || !title.trim()}
            style={{ backgroundColor: '#0F2240' }}
            className="text-white h-10 mt-2 disabled:opacity-40"
          >
            {submitting ? 'Creating…' : 'Create kit'}
          </Button>
        </form>

        <div className="text-center mt-4">
          <a
            href={cancelHref}
            className="text-sm text-[#0F2240]/50 hover:text-[#0F2240] underline-offset-2 hover:underline transition-colors"
          >
            Cancel
          </a>
        </div>
      </div>
    </div>
  )
}
