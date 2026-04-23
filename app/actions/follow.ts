'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getFollowState(targetHumanId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase
    .from('follow')
    .select('id')
    .eq('follower_id', user.id)
    .eq('target_human_id', targetHumanId)
    .maybeSingle()
  return !!data
}

export async function followHuman(targetHumanId: string, targetUsername: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (targetHumanId === user.id) throw new Error('Cannot follow yourself')

  const { error } = await supabase
    .from('follow')
    .insert({
      follower_id: user.id,
      target_type: 'human',
      target_human_id: targetHumanId,
    })
  if (error && error.code !== '23505') throw error

  revalidatePath(`/${targetUsername}`)
}

export async function unfollowHuman(targetHumanId: string, targetUsername: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('follow')
    .delete()
    .eq('follower_id', user.id)
    .eq('target_human_id', targetHumanId)
  if (error) throw new Error(error.message)

  revalidatePath(`/${targetUsername}`)
}

export async function followDog(targetDogId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: dog } = await supabase
    .from('dog')
    .select('owner_id')
    .eq('id', targetDogId)
    .maybeSingle()
  if (dog?.owner_id === user.id) throw new Error('Cannot follow your own dog')

  const { error } = await supabase.from('follow').insert({
    follower_id: user.id,
    target_type: 'dog',
    target_dog_id: targetDogId,
  })
  if (error && error.code !== '23505') throw new Error(error.message)

  revalidatePath('/', 'layout')
}

export async function unfollowDog(targetDogId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('follow')
    .delete()
    .eq('follower_id', user.id)
    .eq('target_dog_id', targetDogId)
  if (error) throw new Error(error.message)

  revalidatePath('/', 'layout')
}
