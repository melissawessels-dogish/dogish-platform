import { createServerClient } from '@supabase/ssr'

export async function createClient() {
  // Dynamic import keeps next/headers (a CJS-only module) out of the module's
  // top-level evaluation. If Turbopack accidentally includes this file in a
  // client chunk, it won't trigger "require is not defined" at load time.
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from a Server Component — cookies can only be
            // set from a Server Function or Route Handler, so this is a no-op.
          }
        },
      },
    }
  )
}
