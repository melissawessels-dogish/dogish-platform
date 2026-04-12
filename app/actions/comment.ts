'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addComment(postId: string, body: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('comment').insert({
    post_id: postId,
    author_id: user.id,
    body: body.trim(),
  })

  if (error) return { error: error.message }
  revalidatePath(`/posts/${postId}`)
  revalidatePath('/home')
  return { success: true }
}

export async function deleteComment(commentId: string, postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await supabase.from('comment').delete()
    .eq('id', commentId)
    .eq('author_id', user.id)

  revalidatePath(`/posts/${postId}`)
  return { success: true }
}
