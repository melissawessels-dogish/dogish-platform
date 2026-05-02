'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, PlusSquare, Store, MessageCircle } from 'lucide-react'

type Props = {
  username: string | null
}

export default function BottomNav({ username: _username }: Props) {
  const pathname = usePathname()

  const items = [
    { href: '/home',      icon: Home,          label: 'Home',    active: pathname === '/home' },
    { href: '/discover',  icon: Compass,        label: 'Discover', active: pathname.startsWith('/discover') },
    { href: '/posts/new', icon: PlusSquare,     label: 'Create',  active: pathname === '/posts/new' },
    { href: '/shop',      icon: Store,          label: 'Shop',    active: pathname.startsWith('/shop') },
    { href: '/inbox',     icon: MessageCircle,  label: 'Inbox',   active: pathname.startsWith('/inbox') },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#0F2240]/8">
      <div className="max-w-[640px] mx-auto flex items-center justify-around h-14 px-2">
        {items.map(({ href, icon: Icon, label, active }) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className="flex flex-col items-center justify-center flex-1 h-full transition-colors"
          >
            <Icon
              size={24}
              strokeWidth={active ? 2.5 : 1.8}
              style={{ color: '#0F2240', opacity: active ? 1 : 0.4 }}
            />
          </Link>
        ))}
      </div>
    </nav>
  )
}
