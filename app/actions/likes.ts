'use server'

import { createClient } from '@/lib/supabase/server'

export async function toggleLike(postId: string, wasLiked: boolean): Promise<{ liked: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  if (wasLiked) {
    const { error } = await supabase
      .from('like_')
      .delete()
      .eq('human_id', user.id)
      .eq('post_id', postId)
    if (error) throw error
    return { liked: false }
  } else {
    const { error } = await supabase
      .from('like_')
      .insert({ human_id: user.id, post_id: postId })
    if (error && error.code !== '23505') throw error // swallow duplicate
    return { liked: true }
  }
}
