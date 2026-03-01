import { createClient } from '@/lib/supabase/server'
import { WorkoutClient } from './WorkoutClient'

export default async function WorkoutPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today      = new Date().toISOString().split('T')[0]
  const sevenAgo   = new Date(Date.now() - 7  * 864e5).toISOString().split('T')[0]
  const ninetyAgo  = new Date(Date.now() - 90 * 864e5).toISOString().split('T')[0]

  // ── Profile (goal + activity level for AI context) ──────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('fitness_goal, activity_level')
    .eq('user_id', user.id)
    .single()

  // ── Today's workout ──────────────────────────────────────────
  const { data: todayWorkout } = await supabase
    .from('workouts')
    .select('id, workout_exercises(*), workout_muscles(muscle_group)')
    .eq('user_id', user.id)
    .eq('date', today)
    .limit(1)
    .maybeSingle()

  // ── Last 5 previous workouts (for history section) ───────────
  const { data: recentWorkouts } = await supabase
    .from('workouts')
    .select('id, date, workout_exercises(*), workout_muscles(muscle_group)')
    .eq('user_id', user.id)
    .lt('date', today)
    .order('date', { ascending: false })
    .limit(5)

  // ── Recent muscles for AI suggestion ────────────────────────
  const { data: recentForMuscles } = await supabase
    .from('workouts')
    .select('id, date')
    .eq('user_id', user.id)
    .gte('date', sevenAgo)
    .order('date', { ascending: false })

  const muscleWkIds = (recentForMuscles ?? []).map(w => w.id)

  const { data: muscleRows } = muscleWkIds.length
    ? await supabase
        .from('workout_muscles')
        .select('muscle_group, workout_id')
        .in('workout_id', muscleWkIds)
    : { data: [] }

  // Build muscle → days-since-trained map
  const dateMap = new Map((recentForMuscles ?? []).map(w => [w.id, w.date]))
  const muscleDaysMap: Record<string, number> = {}
  for (const row of (muscleRows ?? [])) {
    const d = dateMap.get(row.workout_id)
    if (!d) continue
    const diff = Math.round((new Date(today).getTime() - new Date(d).getTime()) / 864e5)
    if (muscleDaysMap[row.muscle_group] === undefined || diff < muscleDaysMap[row.muscle_group]) {
      muscleDaysMap[row.muscle_group] = diff
    }
  }
  const recentMuscles = Object.entries(muscleDaysMap).map(([muscle_group, days_since]) => ({
    muscle_group, days_since,
  }))

  // ── Personal records — max weight per exercise (last 90 days) ─
  const { data: allWorkouts90 } = await supabase
    .from('workouts')
    .select('id')
    .eq('user_id', user.id)
    .gte('date', ninetyAgo)

  const ids90 = (allWorkouts90 ?? []).map(w => w.id)

  const { data: allExercises } = ids90.length
    ? await supabase
        .from('workout_exercises')
        .select('exercise_name, weight, sets, reps')
        .in('workout_id', ids90)
        .not('weight', 'is', null)
    : { data: [] }

  type PREntry = { weight: number; sets: number; reps: number }
  const prMap: Record<string, PREntry> = {}
  for (const ex of (allExercises ?? [])) {
    if (!ex.weight) continue
    if (!prMap[ex.exercise_name] || ex.weight > prMap[ex.exercise_name].weight) {
      prMap[ex.exercise_name] = { weight: Number(ex.weight), sets: ex.sets ?? 0, reps: ex.reps ?? 0 }
    }
  }
  const personalRecords = Object.entries(prMap)
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10)

  // ── Shape today's workout data ───────────────────────────────
  type DbExercise = { id: string; exercise_name: string; sets: number; reps: number; weight: number | null }
  const todayExercises = ((todayWorkout?.workout_exercises ?? []) as DbExercise[])
  const todayMuscles   = ((todayWorkout?.workout_muscles   ?? []) as { muscle_group: string }[])
    .map(m => m.muscle_group)

  // ── Shape history data ───────────────────────────────────────
  type WorkoutRow = typeof recentWorkouts extends (infer T)[] | null ? T : never
  const history = (recentWorkouts ?? []).map((w: WorkoutRow) => ({
    id:   w.id as string,
    date: w.date as string,
    exercises: ((w.workout_exercises ?? []) as DbExercise[]),
    muscles:   ((w.workout_muscles   ?? []) as { muscle_group: string }[]).map(m => m.muscle_group),
  }))

  return (
    <WorkoutClient
      userId={user.id}
      todayWorkoutId={todayWorkout?.id ?? null}
      initialExercises={todayExercises}
      initialMuscles={todayMuscles}
      recentWorkouts={history}
      personalRecords={personalRecords}
      recentMuscles={recentMuscles}
      goal={profile?.fitness_goal ?? ''}
      activityLevel={profile?.activity_level ?? ''}
    />
  )
}
