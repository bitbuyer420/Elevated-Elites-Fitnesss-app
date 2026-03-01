'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase/client'

// Pages surfaced in the top navigation (Phase 1 — stub routes ready for Phase 2)
const NAV_LINKS = [
  { href: '/dashboard',  label: 'Dashboard'  },
  { href: '/workouts',   label: 'Workouts'   },
  { href: '/nutrition',  label: 'Nutrition'  },
  { href: '/profile',    label: 'Profile'    },
] as const

interface GlassNavProps {
  /** Authenticated user's email, shown in the account menu */
  userEmail?: string
}

/**
 * GlassNav — fixed top navigation bar.
 *
 * Applies the glass-nav surface (backdrop-blur + semi-transparent dark bg).
 * Highlights the active route and provides a Sign Out action.
 * Must be used inside a Client Component boundary.
 */
export function GlassNav({ userEmail }: GlassNavProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // A link is "active" if the current path starts with its href
  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <nav className="glass-nav fixed top-0 left-0 right-0 z-50 h-16 animate-slideDown">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-4">

        {/* ── Brand ─────────────────────────────────────────── */}
        <Link
          href="/dashboard"
          className="flex items-center gap-3 shrink-0 group"
          aria-label="Elevated Elites — home"
        >
          {/* Logo mark */}
          <div className="relative w-8 h-8 rounded-[7px] bg-elite-red flex items-center justify-center shadow-red-sm group-hover:shadow-red-md transition-shadow duration-200">
            <span className="text-white font-black text-[13px] tracking-tighter select-none">
              EE
            </span>
            {/* Subtle inner highlight */}
            <div className="absolute inset-0 rounded-[7px] bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
          </div>
          {/* Wordmark — hidden on smallest screens */}
          <span className="hidden sm:block font-black tracking-[0.18em] text-[13px] uppercase text-white leading-none">
            Elevated{' '}
            <span className="text-elite-red">Elites</span>
          </span>
        </Link>

        {/* ── Navigation Links ──────────────────────────────── */}
        <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                'px-4 py-2 rounded-lg text-[13px] font-semibold tracking-wide transition-all duration-150',
                isActive(href)
                  ? 'text-white bg-white/10 border border-white/10'
                  : 'text-white/50 hover:text-white/90 hover:bg-white/5 border border-transparent'
              )}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* ── Account ───────────────────────────────────────── */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Email badge — desktop only */}
          {userEmail && (
            <span className="hidden lg:block text-white/30 text-xs truncate max-w-[160px]">
              {userEmail}
            </span>
          )}

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="btn-ghost text-xs px-3 py-2 hover:text-elite-red hover:bg-elite-red/10 transition-colors"
            aria-label="Sign out"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-elite-red/40 to-transparent" />
    </nav>
  )
}
