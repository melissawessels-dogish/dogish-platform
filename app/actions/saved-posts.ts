'use server'

import { createClient } from '@/lib/supabase/server'

async function getSavedKitId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('kit')
    .select('id')
    .eq('owner_id', userId)
    .eq('title', 'Saved')
    .eq('is_system', true)
    .limit(1)
    .maybeSingle()
  return data?.id ?? null
}

export async function savePostToKit(postId: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id
  if (!userId) return { error: 'Not authenticated' }

  const kitId = await getSavedKitId(supabase, userId)
  if (!kitId) return { error: 'Saved kit not found' }

  const { error } = await supabase
    .from('kit_items')
    .insert({ pack_id: kitId, item_type: 'post', post_id: postId })

  if (error && error.code !== '23505') return { error: error.message }
  return { success: true }
}

export async function unsavePostFromKit(postId: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id
  if (!userId) return { error: 'Not authenticated' }

  const kitId = await getSavedKitId(supabase, userId)
  if (!kitId) return { error: 'Saved kit not found' }

  const { error } = await supabase
    .from('kit_items')
    .delete()
    .eq('pack_id', kitId)
    .eq('post_id', postId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function getSavedPostIds(postIds: string[]): Promise<string[]> {
  if (postIds.length === 0) return []
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id
  if (!userId) return []

  const kitId = await getSavedKitId(supabase, userId)
  if (!kitId) return []

  const { data } = await supabase
    .from('kit_items')
    .select('post_id')
    .eq('pack_id', kitId)
    .in('post_id', postIds)

  return (data ?? []).map((r) => r.post_id as string).filter(Boolean)
}
