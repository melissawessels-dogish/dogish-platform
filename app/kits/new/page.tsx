'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'

const KIT_TYPES = [
  { value: 'gear', label: 'Gear' },
  { value: 'places', label: 'Places' },
  { value: 'food', label: 'Food & Treats' },
  { value: 'health', label: 'Health & Care' },
  { value: 'wishlist', label: 'Wish List' },
  { value: 'favorites', label: 'Favorites' },
] as const

type KitTypeValue = typeof KIT_TYPES[number]['value']

type UserDog = {
  id: string
  name: string
  avatar: string | null
}

function getDescriptionPlaceholder(type: KitTypeValue | null, name: string | null): string {
  const n = name ?? 'your dog'
  switch (type) {
    case 'gear':      return `e.g. ${n}'s harness, leash, favorite toys, bed`
    case 'places':    return `e.g. Our favorite parks, trails, and dog-friendly spots`
    case 'food':      return `e.g. The kibble ${n} eats, favorite treats, supplements`
    case 'health':    return `e.g. ${n}'s vet, medications, supplements, groomer`
    case 'wishlist':  return `e.g. Things we want to try`
    case 'favorites': return `e.g. Anything and everything ${n} loves`
    default:          return "What's this kit about?"
  }
}

export default function NewKitPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const dogId = searchParams.get('dog')

  const [userDogs, setUserDogs] = useState<UserDog[]>([])
  const [taggedDogs, setTaggedDogs] = useState<string[]>([])
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

      const { data: dogsData } = await supabase
        .from('dog')
        .select('id, name, avatar')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })

      const dogs: UserDog[] = dogsData ?? []
      setUserDogs(dogs)

      if (dogId) {
        const match = dogs.find((d) => d.id === dogId)
        if (match) {
          setDogName(match.name)
          setTaggedDogs([dogId])
          if (username) setCancelHref(`/${username}/${match.name.toLowerCase()}`)
        }
      } else {
        if (username) setCancelHref(`/${username}`)
      }
    }

    loadContext()
  }, [dogId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTypeSelect = (type: KitTypeValue) => {
    setSelectedType(selectedType === type ? null : type)
  }

  const toggleDog = (id: string) => {
    setTaggedDogs((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: newKit, error: insertError } = await supabase
        .from('kit')
        .insert({
          owner_id: user.id,
          title: title.trim(),
          type: selectedType ?? null,
          description: description.trim() || null,
          is_private: isPrivate,
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('[kit insert error]', insertError)
        throw insertError
      }

      if (taggedDogs.length > 0) {
        const { error: kitDogsError } = await supabase
          .from('kit_dogs')
          .insert(taggedDogs.map((id) => ({ kit_id: newKit.id, dog_id: id })))
        if (kitDogsError) {
          console.error('[kit_dogs insert error]', kitDogsError)
          throw kitDogsError
        }
      }

      router.push(cancelHref)
    } catch (err: unknown) {
      console.error('[handleSubmit caught]', err)
      const msg =
        err instanceof Error
          ? err.message
          : typeof (err as { message?: string }).message === 'string'
          ? (err as { message: string }).message
          : JSON.stringify(err)
      setError(msg)
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

          {/* Tag dogs */}
          {userDogs.length > 0 && (
            <div className="space-y-2">
              <Label className="text-[#0F2240] font-medium text-sm">
                Tag your dogs <span className="text-[#0F2240]/40 font-normal">(optional)</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {userDogs.map((dog) => (
                  <button
                    key={dog.id}
                    type="button"
                    onClick={() => toggleDog(dog.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      taggedDogs.includes(dog.id)
                        ? 'bg-[#0F2240] text-white'
                        : 'bg-[#F7F3EE] text-[#0F2240] hover:bg-[#EDE3D6]'
                    }`}
                  >
                    {dog.avatar && (
                      <div className="relative w-4 h-4 rounded-full overflow-hidden shrink-0">
                        <Image src={dog.avatar} alt={dog.name} fill className="object-cover" />
                      </div>
                    )}
                    {dog.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-[#0F2240] font-medium text-sm">Description <span className="text-[#0F2240]/40 font-normal">(optional)</span></Label>
            <div className="relative">
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={getDescriptionPlaceholder(selectedType, dogName)}
                rows={3}
                maxLength={300}
                className="border-[#0F2240]/20 focus-visible:ring-[#0F2240] text-[#0F2240] resize-none pb-5"
              />
              <p className="absolute bottom-2 right-3 text-xs text-[#0F2240]/40 pointer-events-none">{description.length}/300</p>
            </div>
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
