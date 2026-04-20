'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function savePost(postId: string, folderId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('saved_post')
    .insert({ human_id: user.id, post_id: postId, folder_id: folderId ?? null })

  if (error && error.code !== '23505') return { error: error.message }
  revalidatePath('/saved')
  return { success: true }
}

export async function unsavePost(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('saved_post')
    .delete()
    .eq('human_id', user.id)
    .eq('post_id', postId)

  if (error) return { error: error.message }
  revalidatePath('/saved')
  return { success: true }
}

export async function getSavedPostIds(): Promise<string[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('saved_post')
    .select('post_id')
    .eq('human_id', user.id)

  return data?.map(r => r.post_id) ?? []
}

export async function createFolder(name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('saved_folder')
    .insert({ owner_id: user.id, name })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/saved')
  return { folder: data }
}

export async function getFolders() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('saved_folder')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })

  return data ?? []
}

export async function movePostToFolder(postId: string, folderId: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('saved_post')
    .update({ folder_id: folderId })
    .eq('human_id', user.id)
    .eq('post_id', postId)

  if (error) return { error: error.message }
  revalidatePath('/saved')
  return { success: true }
}
