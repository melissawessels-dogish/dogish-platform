'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createStory(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const file = formData.get('file') as File | null
  const dogId = formData.get('dog_id') as string | null
  const caption = formData.get('caption') as string | null

  if (!file) throw new Error('No file provided')

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `stories/${user.id}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('stories')
    .upload(path, file, { contentType: file.type, upsert: false })
  if (uploadError) throw new Error(uploadError.message)

  const { data: { publicUrl } } = supabase.storage
    .from('stories')
    .getPublicUrl(path)

  const mediaType = file.type.startsWith('video/') ? 'video' : 'image'

  const { error } = await supabase.from('story').insert({
    author_id: user.id,
    dog_id: dogId || null,
    media_url: publicUrl,
    media_type: mediaType,
    caption: caption || null,
  })
  if (error) throw new Error(error.message)

  revalidatePath('/home')
}

export async function markStoryViewed(storyId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('story_view').upsert(
    { story_id: storyId, viewer_id: user.id },
    { onConflict: 'story_id,viewer_id', ignoreDuplicates: true }
  )
}
