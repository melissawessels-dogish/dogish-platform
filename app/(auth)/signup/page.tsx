'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signUp } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(signUp, null)

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#F7F3EE' }}>
      <div className="w-full max-w-sm">
        {/* Wordmark */}
        <div className="text-center mb-8">
          <span
            className="text-4xl tracking-tight"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: '#0F2240' }}
          >
            Dogish
          </span>
          <p className="mt-2 text-sm text-neutral-500">Create your account</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-8">
          {state?.message ? (
            <div className="text-center space-y-4">
              <div
                className="rounded-lg px-4 py-5 text-sm leading-relaxed"
                style={{ backgroundColor: '#E8C4B8', color: '#0F2240' }}
              >
                {state.message}
              </div>
              <p className="text-sm text-neutral-500">
                Once confirmed, you can{' '}
                <Link href="/login" className="font-medium underline underline-offset-4" style={{ color: '#0F2240' }}>
                  sign in
                </Link>
                .
              </p>
            </div>
          ) : (
            <form action={formAction} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium" style={{ color: '#0F2240' }}>
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-neutral-400 focus:bg-white focus:ring-2 focus:ring-neutral-200"
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-sm font-medium" style={{ color: '#0F2240' }}>
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-neutral-400 focus:bg-white focus:ring-2 focus:ring-neutral-200"
                  placeholder="Min. 6 characters"
                />
              </div>

              {state?.error && (
                <p className="text-sm text-red-600">{state.error}</p>
              )}

              <Button
                type="submit"
                disabled={isPending}
                className="w-full h-10 text-sm font-medium"
                style={{ backgroundColor: '#0F2240', color: '#F7F3EE' }}
              >
                {isPending ? 'Creating account…' : 'Create account'}
              </Button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-neutral-500">
          Already have an account?{' '}
          <Link href="/login" className="font-medium underline underline-offset-4" style={{ color: '#0F2240' }}>
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
