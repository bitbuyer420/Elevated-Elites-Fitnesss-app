import { createClient } from '@/lib/supabase/server'
import { GlassCard }   from '@/components/GlassCard'
import { MuscleMapClient }      from './MuscleMapClient'
import { CalendarClient }       from './CalendarClient'
import { ProgressChartsClient } from './ProgressChartsClient'

// Compute the ISO week label (e.g. "W12") for a given date string.
// Uses the ISO 8601 week definition (weeks start Monday, week 1 contains Jan 4).
function isoWeekLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 864e5 + 1) / 7)
  return `W${week}`
}

export default async function ProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today        = new Date()
  const todayStr     = today.toISOString().split('T')[0]
  const sevenAgo     = new Date(today.getTime() - 7  * 864e5).toISOString().split('T')[0]
  const sixtyAgo     = new Date(today.getTime() - 60 * 864e5).toISOString().split('T')[0]
  const thirtyAgo    = new Date(today.getTime() - 30 * 864e5).toISOString().split('T')[0]
  const ninetyAgo    = new Date(today.getTime() - 90 * 864e5).toISOString().split('T')[0]
  const eightWeeksAgo = new Date(today.getTime() - 56 * 864e5).toISOString().split('T')[0]

  // Get recent workouts for muscle recovery data
  const { data: recentWorkouts } = await supabase
    .from('workouts')
    .select('id, date')
    .eq('user_id', user.id)
    .gte('date', sevenAgo)
    .order('date', { ascending: false })

  const workoutIds = (recentWorkouts ?? []).map(w => w.id)

  const { data: muscleRows } = workoutIds.length
    ? await supabase.from('workout_muscles').select('muscle_group, workout_id').in('workout_id', workoutIds)
    : { data: [] }

  // Build muscle → days since trained map
  const workoutDateMap = new Map((recentWorkouts ?? []).map(w => [w.id, w.date]))

  const muscleDays: Record<string, number> = {}
  for (const row of (muscleRows ?? [])) {
    const date = workoutDateMap.get(row.workout_id)
    if (!date) continue
    const diff = Math.round((new Date(todayStr).getTime() - new Date(date).getTime()) / 864e5)
    if (muscleDays[row.muscle_group] === undefined || diff < muscleDays[row.muscle_group]) {
      muscleDays[row.muscle_group] = diff
    }
  }

  // Parallel queries: calendar + chart data
  const [
    { data: workoutDates },
    { data: mealDates },
    { data: weightLogs },
    { data: todayWeightRow },
    { data: calorieRows },
    { data: volumeWorkouts },
    { data: goalsRow },
  ] = await Promise.all([
    // Calendar — last 60 days
    supabase.from('workouts').select('date').eq('user_id', user.id).gte('date', sixtyAgo),
    supabase.from('meals').select('date').eq('user_id', user.id).gte('date', sixtyAgo),

    // Weight chart — last 90 days
    supabase.from('body_weight_logs').select('date, weight_kg')
      .eq('user_id', user.id).gte('date', ninetyAgo).order('date', { ascending: true }),

    // Today's weight only (pre-fill input)
    supabase.from('body_weight_logs').select('weight_kg')
      .eq('user_id', user.id).eq('date', todayStr).maybeSingle(),

    // Meals + items for calorie chart — last 30 days
    supabase.from('meals').select('date, meal_items(calories)')
      .eq('user_id', user.id).gte('date', thirtyAgo),

    // Workouts + exercises for volume chart — last 8 weeks
    supabase.from('workouts').select('date, workout_exercises(sets)')
      .eq('user_id', user.id).gte('date', eightWeeksAgo),

    // Calorie goal for reference line
    supabase.from('daily_goals').select('calorie_goal')
      .eq('user_id', user.id).maybeSingle(),
  ])

  // ── Calendar data ──────────────────────────────────────────────────────────
  const workoutSet = new Set((workoutDates ?? []).map(w => w.date))
  const mealSet    = new Set((mealDates   ?? []).map(m => m.date))
  const allDates   = Array.from(new Set([
    ...Array.from(workoutSet),
    ...Array.from(mealSet),
  ]))
  const calData = allDates.map(date => ({
    date,
    workout: workoutSet.has(date),
    meals:   mealSet.has(date),
  }))

  // ── Weight log data ────────────────────────────────────────────────────────
  // Supabase returns numeric columns as strings over JSON; parseFloat normalises them.
  const weightLogData = (weightLogs ?? []).map(row => ({
    date:   row.date as string,
    weight: parseFloat(row.weight_kg as unknown as string),
  }))
  const todayWeightValue: number | null = todayWeightRow?.weight_kg != null
    ? parseFloat(todayWeightRow.weight_kg as unknown as string) : null
  const calorieGoalValue: number | null = goalsRow?.calorie_goal != null
    ? Number(goalsRow.calorie_goal) : null

  // ── Calorie data — aggregate meal_items per day, fill 30-day array ─────────
  const calorieTotals = new Map<string, number>()
  for (const meal of (calorieRows ?? [])) {
    const sum = (meal.meal_items as { calories: number | null }[])
      .reduce((acc, item) => acc + (item.calories ?? 0), 0)
    calorieTotals.set(meal.date, (calorieTotals.get(meal.date) ?? 0) + sum)
  }
  const calorieData: { date: string; calories: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 864e5).toISOString().split('T')[0]
    calorieData.push({ date: d, calories: Math.round(calorieTotals.get(d) ?? 0) })
  }

  // ── Volume data — sum sets per ISO week, last 8 weeks ─────────────────────
  const weeklyMap = new Map<string, number>()
  for (const workout of (volumeWorkouts ?? [])) {
    const label = isoWeekLabel(workout.date as string)
    const sets  = (workout.workout_exercises as { sets: number | null }[])
      .reduce((acc, ex) => acc + (ex.sets ?? 0), 0)
    weeklyMap.set(label, (weeklyMap.get(label) ?? 0) + sets)
  }
  // Walk the last 56 days collecting unique week labels in order
  const seenWeeks = new Set<string>()
  const volumeData: { week: string; sets: number }[] = []
  for (let i = 55; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 864e5).toISOString().split('T')[0]
    const label = isoWeekLabel(d)
    if (!seenWeeks.has(label)) {
      seenWeeks.add(label)
      volumeData.push({ week: label, sets: weeklyMap.get(label) ?? 0 })
    }
  }
  const volumeDataFinal = volumeData.slice(-8)

  return (
    <main className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto pt-8 space-y-6">
      <div className="animate-fadeIn">
        <span className="font-label text-[11px] text-elite-red font-bold tracking-[0.3em] uppercase">Progress</span>
        <h1 className="font-heading text-[44px] text-white tracking-wide mt-1 leading-none">Weight &amp; Performance</h1>
      </div>

      {/* Weight logger + charts */}
      <ProgressChartsClient
        userId={user.id}
        weightLogs={weightLogData}
        todayWeight={todayWeightValue}
        calorieData={calorieData}
        volumeData={volumeDataFinal}
        calorieGoal={calorieGoalValue}
      />

      {/* Muscle map */}
      <GlassCard padding="lg" className="animate-fadeIn [animation-delay:240ms]">
        <div className="mb-4">
          <span className="font-label text-[11px] text-elite-red font-bold tracking-[0.3em] uppercase">Recovery</span>
          <h2 className="font-heading text-[28px] text-white tracking-wide mt-1">Muscle &amp; Consistency</h2>
        </div>
        <MuscleMapClient muscleDays={muscleDays} />
      </GlassCard>

      {/* Legend */}
      <GlassCard padding="md" className="animate-fadeIn [animation-delay:300ms]">
        <div className="flex flex-wrap gap-4 justify-center">
          {[
            { color: '#CC0000', label: 'Trained today' },
            { color: '#881111', label: '1 day ago' },
            { color: '#440000', label: '2 days ago' },
            { color: '#1C1C1C', label: '3+ days / never' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ background: color, border: '1px solid rgba(255,255,255,0.1)' }} />
              <span className="font-label text-xs text-white/40">{label}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Consistency Calendar */}
      <GlassCard padding="lg" className="animate-fadeIn [animation-delay:360ms]">
        <div className="mb-4">
          <span className="font-label text-[11px] text-elite-red font-bold tracking-[0.3em] uppercase">Consistency</span>
          <h2 className="font-heading text-[28px] text-white tracking-wide mt-1">Training Calendar</h2>
        </div>
        <CalendarClient data={calData} />
      </GlassCard>
    </main>
  )
}
