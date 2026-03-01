import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // If already completed skip back to dashboard
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('user_id', user.id)
    .single()

  if (profile?.onboarding_completed) redirect('/dashboard')

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(204,0,0,0.12) 0%, transparent 60%), #0A0A0A' }}
    >
      {children}
    </div>
  )
}
