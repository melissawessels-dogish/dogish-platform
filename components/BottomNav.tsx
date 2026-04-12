'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, PlusSquare, User } from 'lucide-react'

type Props = {
  username: string | null
}

export default function BottomNav({ username }: Props) {
  const pathname = usePathname()

  const items = [
    { href: '/home', icon: Home, label: 'Home' },
    { href: '/search', icon: Search, label: 'Search' },
    { href: '/posts/new', icon: PlusSquare, label: 'New post' },
    { href: username ? `/${username}` : '/onboarding/profile', icon: User, label: 'Profile' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#0F2240]/8">
      <div className="max-w-[640px] mx-auto flex items-center justify-around h-14 px-2">
        {items.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (label === 'Profile' && username && pathname === `/${username}`)
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className="flex flex-col items-center justify-center flex-1 h-full transition-colors"
              style={{ color: active ? '#0F2240' : '#0F2240' }}
            >
              <Icon
                size={24}
                strokeWidth={active ? 2.5 : 1.8}
                style={{ opacity: active ? 1 : 0.4 }}
              />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
