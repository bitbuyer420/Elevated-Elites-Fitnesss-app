import { createClient } from '@/lib/supabase/server'
import { NutritionClient } from './NutritionClient'

export default async function NutritionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today = new Date().toISOString().split('T')[0]

  const [mealsRes, goalsRes] = await Promise.all([
    supabase.from('meals').select('*, meal_items(*)').eq('user_id', user.id).eq('date', today).order('created_at'),
    supabase.from('daily_goals').select('*').eq('user_id', user.id).single(),
  ])

  return (
    <NutritionClient
      userId={user.id}
      initialMeals={mealsRes.data ?? []}
      goals={goalsRes.data}
      initialDate={today}
    />
  )
}
