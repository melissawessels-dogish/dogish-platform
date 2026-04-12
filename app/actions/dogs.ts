'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteDog(dogId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify ownership before deleting
  const { data: dog } = await supabase
    .from('dog')
    .select('id, owner_id')
    .eq('id', dogId)
    .maybeSingle()

  if (!dog) return { error: 'Dog not found' }
  if (dog.owner_id !== user.id) return { error: 'Not authorized' }

  const { error } = await supabase
    .from('dog')
    .delete()
    .eq('id', dogId)

  if (error) return { error: error.message }

  // Get the user's username to revalidate their profile page
  const { data: human } = await supabase
    .from('human')
    .select('username')
    .eq('id', user.id)
    .maybeSingle()

  revalidatePath('/settings/profile')
  if (human?.username) revalidatePath(`/${human.username}`)

  return { success: true }
}
