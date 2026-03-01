'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const NAV = [
  {
    href: '/dashboard',
    label: 'Home',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'rgba(204,0,0,0.2)' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    href: '/progress',
    label: 'Progress',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6v6l4 2"/>
      </svg>
    ),
  },
  {
    href: '/nutrition',
    label: 'Nutrition',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 8h20M8 8V4M12 8V4M16 8V4"/><path d="M4 8c0 8 2 12 8 14C18 20 20 16 20 8"/>
      </svg>
    ),
  },
  {
    href: '/workout',
    label: 'Workout',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 5v14M18 5v14M2 9h4M18 9h4M2 15h4M18 15h4"/>
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'rgba(204,0,0,0.15)' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    ),
  },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="glass-nav-bottom fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{ height: 'var(--nav-bot-h)' }}
    >
      <div className="grid grid-cols-5 h-full">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex flex-col items-center justify-center gap-1 transition-all duration-150',
                active ? 'text-elite-red' : 'text-white/35 hover:text-white/65'
              )}
            >
              {icon(active)}
              <span className={clsx('font-label text-[10px] tracking-wide font-semibold uppercase', active && 'text-elite-red')}>
                {label}
              </span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-elite-red shadow-red-sm" />
              )}
            </Link>
          )
        })}
      </div>

      {/* Top accent line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-elite-red/40 to-transparent" />
    </nav>
  )
}
