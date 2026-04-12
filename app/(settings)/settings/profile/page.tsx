import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ProfileEditForm from '@/components/ProfileEditForm'

export default async function EditProfilePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch the session user's own human row by their auth id
  const admin = createAdminClient()
  const { data: human, error: humanError } = await admin
    .from('human')
    .select('id, display_name, username, bio, location, avatar')
    .eq('id', user.id)
    .maybeSingle()

  console.log('[settings/profile]', { userId: user.id, human: human?.username ?? null, humanError })

  if (!human) redirect('/login')

  const initial = {
    display_name: human.display_name ?? '',
    username: human.username ?? '',
    bio: human.bio ?? '',
    location: human.location ?? '',
    website: '',
    avatar: human.avatar ?? null,
    cover_photo: null,
  }

  return (
    <div className="min-h-svh bg-white">
      <div className="max-w-[480px] mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#0F2240]/8">
          <Link
            href={`/${human.username}`}
            className="inline-flex items-center gap-1.5 text-[13px] text-[#0F2240]/60 hover:text-[#0F2240] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </Link>
          <h1 className="text-[15px] font-semibold text-[#0F2240]">Edit profile</h1>
          {/* Spacer to center the title */}
          <div className="w-12" />
        </div>

        {/* Form */}
        <div className="px-4 py-6">
          <ProfileEditForm userId={user.id} initial={initial} />
        </div>

      </div>
    </div>
  )
}
