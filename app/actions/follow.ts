'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function followHuman(targetHumanId: string, targetUsername: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await supabase.from('follow').insert({
    follower_id: user.id,
    target_type: 'human',
    target_human_id: targetHumanId,
  })
  revalidatePath(`/${targetUsername}`)
}

export async function unfollowHuman(targetHumanId: string, targetUsername: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await supabase.from('follow')
    .delete()
    .eq('follower_id', user.id)
    .eq('target_human_id', targetHumanId)
  revalidatePath(`/${targetUsername}`)
}

export async function followDog(targetDogId: string, revalidateUrl: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await supabase.from('follow').insert({
    follower_id: user.id,
    target_type: 'dog',
    target_dog_id: targetDogId,
  })
  revalidatePath(revalidateUrl)
}

export async function unfollowDog(targetDogId: string, revalidateUrl: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await supabase.from('follow')
    .delete()
    .eq('follower_id', user.id)
    .eq('target_dog_id', targetDogId)
  revalidatePath(revalidateUrl)
}
