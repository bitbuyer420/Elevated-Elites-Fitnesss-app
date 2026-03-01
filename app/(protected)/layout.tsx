import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SideNav }   from '@/components/SideNav'
import { BottomNav } from '@/components/BottomNav'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, onboarding_completed')
    .eq('user_id', user.id)
    .single()

  // Redirect to onboarding if not completed
  if (!profile?.onboarding_completed) redirect('/onboarding')

  return (
    <div className="min-h-dvh" style={{ background: '#0A0A0A' }}>
      <SideNav userEmail={user.email} userName={profile?.name ?? undefined} />

      {/* Content offset for side nav on desktop */}
      <div className="md:pl-[var(--nav-side-w)]">
        <div className="page-content">
          {children}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
