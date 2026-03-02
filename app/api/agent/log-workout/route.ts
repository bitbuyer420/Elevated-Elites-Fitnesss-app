import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase admin client — bypasses RLS so the agent can write on behalf of any user
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Verify the agent token matches the one stored in env
function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get('authorization') ?? ''
  const token = auth.replace('Bearer ', '').trim()
  return token === process.env.AGENT_SECRET_TOKEN
}

/**
 * POST /api/agent/log-workout
 *
 * Body:
 * {
 *   user_email: string          — identifies which user to log for
 *   exercises: [{
 *     name: string
 *     sets: number
 *     reps: number
 *     weight_kg?: number        — optional, omit for bodyweight
 *   }]
 *   muscles?: string[]          — e.g. ["chest","triceps"]
 *   notes?: string
 *   date?: string               — YYYY-MM-DD, defaults to today
 * }
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { user_email, exercises, muscles, notes, date } = body

  if (!user_email || !exercises?.length) {
    return NextResponse.json({ error: 'user_email and exercises are required' }, { status: 400 })
  }

  // Look up user by email
  const { data: { users }, error: userErr } = await supabaseAdmin.auth.admin.listUsers()
  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 })

  const user = users.find(u => u.email === user_email)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const workoutDate = date ?? new Date().toISOString().split('T')[0]

  // Upsert workout row for today
  const { data: existingWorkout } = await supabaseAdmin
    .from('workouts')
    .select('id')
    .eq('user_id', user.id)
    .eq('date', workoutDate)
    .maybeSingle()

  let workoutId: string

  if (existingWorkout) {
    workoutId = existingWorkout.id
  } else {
    const { data: newWorkout, error: wErr } = await supabaseAdmin
      .from('workouts')
      .insert({ user_id: user.id, date: workoutDate, notes: notes ?? null })
      .select('id')
      .single()
    if (wErr || !newWorkout) return NextResponse.json({ error: wErr?.message }, { status: 500 })
    workoutId = newWorkout.id
  }

  // Insert exercises
  const exerciseRows = exercises.map((ex: { name: string; sets: number; reps: number; weight_kg?: number }) => ({
    workout_id:    workoutId,
    exercise_name: ex.name,
    sets:          ex.sets,
    reps:          ex.reps,
    weight:        ex.weight_kg ?? null,
  }))

  const { error: exErr } = await supabaseAdmin.from('workout_exercises').insert(exerciseRows)
  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 })

  // Insert muscle groups if provided
  if (muscles?.length) {
    const muscleRows = muscles.map((m: string) => ({ workout_id: workoutId, muscle_group: m }))
    await supabaseAdmin.from('workout_muscles').upsert(muscleRows, { onConflict: 'workout_id,muscle_group', ignoreDuplicates: true })
  }

  return NextResponse.json({
    success: true,
    workout_id: workoutId,
    date: workoutDate,
    exercises_logged: exercises.length,
    muscles_logged: muscles?.length ?? 0,
  })
}
