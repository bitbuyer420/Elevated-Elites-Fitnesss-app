import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get('authorization') ?? ''
  const token = auth.replace('Bearer ', '').trim()
  return token === process.env.AGENT_SECRET_TOKEN
}

/**
 * GET /api/agent/summary?user_email=...&date=YYYY-MM-DD
 *
 * Returns today's workout + nutrition summary for the Claude agent to read.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const user_email = searchParams.get('user_email')
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  if (!user_email) return NextResponse.json({ error: 'user_email is required' }, { status: 400 })

  // Look up user
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
  const user = users.find(u => u.email === user_email)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Fetch profile + goals
  const [profileRes, goalsRes, workoutRes, mealsRes] = await Promise.all([
    supabaseAdmin.from('profiles').select('name, fitness_goal, activity_level, weight, height').eq('user_id', user.id).single(),
    supabaseAdmin.from('daily_goals').select('*').eq('user_id', user.id).single(),
    supabaseAdmin.from('workouts').select('id, notes, workout_exercises(exercise_name, sets, reps, weight), workout_muscles(muscle_group)')
      .eq('user_id', user.id).eq('date', date).maybeSingle(),
    supabaseAdmin.from('meals').select('meal_name, time_of_day, meal_items(food_name, calories, protein, carbs, fat)')
      .eq('user_id', user.id).eq('date', date),
  ])

  // Aggregate nutrition
  const nutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 }
  for (const meal of mealsRes.data ?? []) {
    for (const item of (meal.meal_items as { calories: number; protein: number; carbs: number; fat: number }[] ?? [])) {
      nutrition.calories += item.calories ?? 0
      nutrition.protein  += item.protein  ?? 0
      nutrition.carbs    += item.carbs    ?? 0
      nutrition.fat      += item.fat      ?? 0
    }
  }

  const goals = goalsRes.data
  const profile = profileRes.data
  const workout = workoutRes.data

  return NextResponse.json({
    date,
    user: {
      name:          profile?.name,
      fitness_goal:  profile?.fitness_goal,
      activity_level: profile?.activity_level,
      weight_kg:     profile?.weight,
    },
    goals: {
      calories: goals?.calorie_goal,
      protein:  goals?.protein_goal,
      carbs:    goals?.carb_goal,
      fat:      goals?.fat_goal,
    },
    today_nutrition: {
      calories_consumed: Math.round(nutrition.calories),
      protein_g:  Math.round(nutrition.protein),
      carbs_g:    Math.round(nutrition.carbs),
      fat_g:      Math.round(nutrition.fat),
      calories_remaining: goals?.calorie_goal ? Math.round(goals.calorie_goal - nutrition.calories) : null,
    },
    today_workout: workout ? {
      logged: true,
      exercises: (workout.workout_exercises as { exercise_name: string; sets: number; reps: number; weight: number }[] ?? []).map(e => ({
        name:      e.exercise_name,
        sets:      e.sets,
        reps:      e.reps,
        weight_kg: e.weight,
      })),
      muscles: (workout.workout_muscles as { muscle_group: string }[] ?? []).map(m => m.muscle_group),
    } : {
      logged: false,
      exercises: [],
      muscles: [],
    },
    meals_today: (mealsRes.data ?? []).map(m => ({
      type:  m.time_of_day,
      items: (m.meal_items as { food_name: string; calories: number }[] ?? []).map(i => ({
        name:     i.food_name,
        calories: Math.round(i.calories ?? 0),
      })),
    })),
  })
}
