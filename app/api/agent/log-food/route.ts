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
 * POST /api/agent/log-food
 *
 * Body:
 * {
 *   user_email: string
 *   meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_workout' | 'post_workout'
 *   items: [{
 *     name: string
 *     calories: number
 *     protein_g: number
 *     carbs_g: number
 *     fat_g: number
 *   }]
 *   date?: string    — YYYY-MM-DD, defaults to today
 * }
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { user_email, meal_type, items, date } = body

  if (!user_email || !meal_type || !items?.length) {
    return NextResponse.json({ error: 'user_email, meal_type, and items are required' }, { status: 400 })
  }

  // Look up user
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
  const user = users.find(u => u.email === user_email)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const mealDate = date ?? new Date().toISOString().split('T')[0]

  // Find or create meal row
  const { data: existingMeal } = await supabaseAdmin
    .from('meals')
    .select('id')
    .eq('user_id', user.id)
    .eq('date', mealDate)
    .eq('time_of_day', meal_type)
    .maybeSingle()

  let mealId: string

  if (existingMeal) {
    mealId = existingMeal.id
  } else {
    const { data: newMeal, error: mErr } = await supabaseAdmin
      .from('meals')
      .insert({
        user_id:     user.id,
        date:        mealDate,
        meal_name:   meal_type.replace('_', ' '),
        time_of_day: meal_type,
      })
      .select('id')
      .single()
    if (mErr || !newMeal) return NextResponse.json({ error: mErr?.message }, { status: 500 })
    mealId = newMeal.id
  }

  // Insert food items
  const itemRows = items.map((i: { name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }) => ({
    meal_id:   mealId,
    food_name: i.name,
    calories:  i.calories,
    protein:   i.protein_g,
    carbs:     i.carbs_g,
    fat:       i.fat_g,
  }))

  const { error: iErr } = await supabaseAdmin.from('meal_items').insert(itemRows)
  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 })

  const totalCalories = items.reduce((s: number, i: { calories: number }) => s + i.calories, 0)

  return NextResponse.json({
    success: true,
    meal_id: mealId,
    date: mealDate,
    meal_type,
    items_logged: items.length,
    total_calories: totalCalories,
  })
}
