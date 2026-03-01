import { createClient } from '@/lib/supabase/server'
import { ProfileClient } from './ProfileClient'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [profileRes, goalsRes, workoutCountRes, mealCountRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('daily_goals').select('*').eq('user_id', user.id).single(),
    supabase.from('workouts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('meals').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ])

  return (
    <ProfileClient
      userId={user.id}
      email={user.email ?? ''}
      profile={profileRes.data}
      goals={goalsRes.data}
      workoutCount={workoutCountRes.count ?? 0}
      mealCount={mealCountRes.count ?? 0}
    />
  )
}
