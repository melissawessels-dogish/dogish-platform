'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const USERNAME_RE = /^[a-z0-9_]+$/

type UpdateProfileInput = {
  display_name: string
  username: string
  bio: string
  location: string
  website: string
  avatar: string | null
  cover_photo: string | null
  is_first_time_owner: boolean | null
}

export async function updateProfile(input: UpdateProfileInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const display_name = input.display_name.trim()
  const username = input.username.trim().toLowerCase()
  const bio = input.bio.trim()
  const location = input.location.trim()
  const website = input.website.trim()

  if (!display_name) return { error: 'Display name is required' }
  if (username && !USERNAME_RE.test(username)) {
    return { error: 'Username may only contain letters, numbers, and underscores' }
  }

  // Check username uniqueness (if provided and changed)
  if (username) {
    const { data: existing } = await supabase
      .from('human')
      .select('id')
      .eq('username', username)
      .neq('id', user.id)
      .maybeSingle()
    if (existing) return { error: 'That username is already taken' }
  }

  const updatePayload: Record<string, unknown> = {
    display_name,
    username: username || null,
    bio: bio || null,
    location: location || null,
    avatar: input.avatar,
    is_first_time_owner: input.is_first_time_owner ?? null,
  }
  if (input.cover_photo !== undefined) {
    updatePayload.cover_photo = input.cover_photo
  }

  const { error: updateError } = await supabase
    .from('human')
    .update(updatePayload)
    .eq('id', user.id)

  if (updateError) return { error: updateError.message }

  revalidatePath(`/${username}`)
  return { success: true, username }
}
