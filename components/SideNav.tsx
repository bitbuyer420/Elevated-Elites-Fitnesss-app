'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    href: '/progress',
    label: 'Progress',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6v6l4 2"/>
      </svg>
    ),
  },
  {
    href: '/nutrition',
    label: 'Nutrition',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10"/><path d="M12 8v4l3 3"/><path d="M18 2v4h4"/>
      </svg>
    ),
  },
  {
    href: '/workout',
    label: 'Workout',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 5v14M18 5v14M2 9h4M18 9h4M2 15h4M18 15h4"/>
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    ),
  },
]

interface SideNavProps {
  userEmail?: string
  userName?: string
}

export function SideNav({ userEmail, userName }: SideNavProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const initials = userName
    ? userName.slice(0, 2).toUpperCase()
    : (userEmail?.slice(0, 2).toUpperCase() ?? 'EE')

  return (
    <aside className="glass-nav-side fixed top-0 left-0 h-full z-50 hidden md:flex flex-col"
      style={{ width: 'var(--nav-side-w)' }}>

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/8">
        <div className="w-8 h-8 rounded-lg bg-elite-red flex items-center justify-center shadow-red-sm shrink-0">
          <span className="font-heading text-white text-sm leading-none">EE</span>
        </div>
        <div className="overflow-hidden">
          <p className="font-heading text-[15px] tracking-[0.15em] text-white leading-none uppercase truncate">
            Elevated <span className="text-elite-red">Elites</span>
          </p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group',
                active
                  ? 'bg-elite-red/15 text-white border border-elite-red/25'
                  : 'text-white/45 hover:text-white/90 hover:bg-white/5 border border-transparent'
              )}
            >
              <span className={clsx('shrink-0 transition-colors', active ? 'text-elite-red' : 'group-hover:text-white/80')}>
                {icon}
              </span>
              <span className="font-label font-semibold text-[14px] tracking-wide">{label}</span>
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-elite-red shadow-red-sm" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User + sign out */}
      <div className="border-t border-white/8 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-elite-red/20 border border-elite-red/30 flex items-center justify-center shrink-0">
            <span className="font-heading text-elite-red text-xs">{initials}</span>
          </div>
          <p className="text-white/40 text-xs font-body truncate flex-1">{userEmail}</p>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/35 hover:text-elite-red hover:bg-elite-red/10 transition-colors text-sm font-label font-medium tracking-wide"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  )
}
