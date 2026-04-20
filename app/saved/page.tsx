import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getFolders } from '@/app/actions/saved-posts'
import { SavedPageClient, type SavedPost } from './saved-page-client'
import BottomNav from '@/components/BottomNav'

export default async function SavedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: me } = await supabase
    .from('human')
    .select('username')
    .eq('id', user.id)
    .maybeSingle()

  const { data: savedPosts } = await supabase
    .from('saved_post')
    .select(`
      id,
      post_id,
      folder_id,
      created_at,
      post:post_id (
        id,
        body,
        images,
        created_at,
        author:author_id (
          username,
          display_name,
          avatar
        )
      )
    `)
    .eq('human_id', user.id)
    .order('created_at', { ascending: false })

  const folders = await getFolders()

  return (
    <div className="min-h-svh bg-white pb-16">
      <SavedPageClient
        savedPosts={(savedPosts ?? []) as unknown as SavedPost[]}
        folders={folders}
      />
      <BottomNav username={me?.username ?? null} />
    </div>
  )
}
