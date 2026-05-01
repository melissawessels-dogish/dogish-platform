'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function quickRepost(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('repost').insert({
    reposter_id: user.id,
    original_post_id: postId,
  })
  if (error && error.code !== '23505') throw new Error(error.message)
  revalidatePath('/home')
}

export async function quoteRepost(postId: string, caption: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Upsert so that if a quick repost row already exists, we just add the caption.
  // The repost_count trigger only fires on INSERT, so count stays correct either way.
  const { error } = await supabase.from('repost').upsert(
    { reposter_id: user.id, original_post_id: postId, caption: caption.trim() || null },
    { onConflict: 'reposter_id,original_post_id' }
  )
  if (error) throw new Error(error.message)
  revalidatePath('/home')
}

export async function undoRepost(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('repost')
    .delete()
    .eq('reposter_id', user.id)
    .eq('original_post_id', postId)
  if (error) throw new Error(error.message)
  revalidatePath('/home')
}

export async function getUserReposts(postIds: string[]): Promise<string[]> {
  if (postIds.length === 0) return []
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('repost')
    .select('original_post_id')
    .eq('reposter_id', user.id)
    .in('original_post_id', postIds)

  return (data ?? []).map((r) => r.original_post_id as string).filter(Boolean)
}
