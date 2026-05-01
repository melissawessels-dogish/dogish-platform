'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const trimmedCaption = caption.trim() || null

  // Check before upsert so we can tell if this is a new insert or an update
  const { data: existing } = await supabase
    .from('repost')
    .select('id')
    .eq('reposter_id', user.id)
    .eq('original_post_id', postId)
    .maybeSingle()

  const { error } = await supabase.from('repost').upsert(
    { reposter_id: user.id, original_post_id: postId, caption: trimmedCaption },
    { onConflict: 'reposter_id,original_post_id' }
  )
  if (error) throw new Error(error.message)

  // Trigger only fires on INSERT; manually increment when this is a new row
  if (!existing) {
    const { data: postRow } = await admin.from('post').select('repost_count').eq('id', postId).single()
    if (postRow) {
      await admin.from('post')
        .update({ repost_count: (postRow.repost_count ?? 0) + 1 })
        .eq('id', postId)
    }
  }

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
