'use server'

import { createClient } from '@/lib/supabase/server'

async function getSavedKitId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string | null> {
  // Look up by owner + title only — avoids dependency on is_system column existing
  const { data, error } = await supabase
    .from('kit')
    .select('id')
    .eq('owner_id', userId)
    .eq('title', 'Saved')
    .limit(1)
    .maybeSingle()

  if (error) console.error('[getSavedKitId] lookup error:', error.message)
  if (data?.id) return data.id

  // Kit doesn't exist yet — create it on the fly
  console.log('[getSavedKitId] Saved kit not found for user', userId, '— creating')
  const { data: newKit, error: insertError } = await supabase
    .from('kit')
    .insert({ owner_id: userId, title: 'Saved', description: 'Posts you have saved', is_private: true })
    .select('id')
    .single()

  if (insertError) console.error('[getSavedKitId] insert error:', insertError.message)
  return newKit?.id ?? null
}

export async function savePostToKit(postId: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id
  if (!userId) return { error: 'Not authenticated' }

  const kitId = await getSavedKitId(supabase, userId)
  if (!kitId) {
    console.error('[savePostToKit] Could not find or create Saved kit for user', userId)
    return { error: 'Saved kit not found' }
  }

  console.log('[savePostToKit] userId:', userId, '| kitId:', kitId, '| postId:', postId)
  const { data: insertData, error } = await supabase
    .from('kit_items')
    .insert({ pack_id: kitId, item_type: 'post', post_id: postId })
    .select()

  console.log('[savePostToKit] insert result — data:', insertData, '| error:', error)

  if (error) {
    if (error.code === '23505') return { success: true } // already saved
    return { error: error.message }
  }
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
