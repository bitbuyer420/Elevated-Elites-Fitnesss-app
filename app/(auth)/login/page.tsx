'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { GlassCard }   from '@/components/GlassCard'
import { GlassButton } from '@/components/GlassButton'

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Full page navigation so the server picks up the new session cookie
    // before any route guard runs — avoids race condition with router.refresh()
    window.location.href = '/dashboard'
  }

  return (
    <main
      className="min-h-dvh flex items-center justify-center px-4 py-16 relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse 80% 55% at 50% 0%, rgba(204,0,0,0.14) 0%, transparent 65%), #0A0A0A' }}
    >
      {/* Decorative elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-48 bg-gradient-to-b from-elite-red/50 to-transparent" />
        <div className="absolute -bottom-32 -left-32  w-80 h-80 rounded-full bg-elite-red/4 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-elite-red/4 blur-3xl" />
      </div>

      <div className="w-full max-w-[420px] relative animate-fadeIn">
        {/* Brand */}
        <div className="text-center mb-8 space-y-3">
          <div className="inline-flex items-center justify-center w-[62px] h-[62px] rounded-2xl bg-elite-red shadow-red-md relative">
            <span className="font-heading text-white text-3xl select-none">EE</span>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
          </div>
          <div>
            <h1 className="font-heading text-[32px] text-white tracking-[0.12em] uppercase leading-none">
              Elevated <span className="text-elite-red">Elites</span>
            </h1>
            <p className="mt-2 text-white/30 text-[11px] font-label tracking-[0.3em] uppercase">Train Without Limits</p>
          </div>
        </div>

        <GlassCard padding="lg" className="shadow-glass-lg">
          <div className="mb-6">
            <h2 className="font-heading text-[26px] text-white tracking-wide">Welcome back</h2>
            <p className="text-white/40 text-sm font-body mt-1">Sign in to continue your journey</p>
          </div>

          {error && (
            <div className="alert-error mb-5" role="alert">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-[12px] font-label font-semibold text-white/55 mb-2 tracking-[0.12em] uppercase">
                Email
              </label>
              <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" autoComplete="email" required className="glass-input" />
            </div>

            <div>
              <label htmlFor="password" className="block text-[12px] font-label font-semibold text-white/55 mb-2 tracking-[0.12em] uppercase">
                Password
              </label>
              <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete="current-password" required className="glass-input" />
            </div>

            <div className="pt-2">
              <GlassButton type="submit" loading={loading} fullWidth>Sign In</GlassButton>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-white/8 text-center">
            <p className="text-white/35 text-sm font-body">
              New here?{' '}
              <Link href="/signup" className="text-elite-red hover:text-[#FF2222] font-semibold transition-colors">
                Create an account
              </Link>
            </p>
          </div>
        </GlassCard>

        <p className="text-center text-white/15 text-[10px] font-label mt-8 tracking-[0.35em] uppercase select-none">
          Discipline · Strength · Excellence
        </p>
      </div>
    </main>
  )
}
