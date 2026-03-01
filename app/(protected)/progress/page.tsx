import { createClient } from '@/lib/supabase/server'
import { GlassCard }   from '@/components/GlassCard'
import { MuscleMapClient } from './MuscleMapClient'
import { CalendarClient }  from './CalendarClient'

export default async function ProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today      = new Date()
  const sevenAgo   = new Date(today.getTime() - 7 * 864e5).toISOString().split('T')[0]
  const sixtyAgo   = new Date(today.getTime() - 60 * 864e5).toISOString().split('T')[0]

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
  const todayStr = today.toISOString().split('T')[0]

  const muscleDays: Record<string, number> = {}
  for (const row of (muscleRows ?? [])) {
    const date = workoutDateMap.get(row.workout_id)
    if (!date) continue
    const diff = Math.round((new Date(todayStr).getTime() - new Date(date).getTime()) / 864e5)
    if (muscleDays[row.muscle_group] === undefined || diff < muscleDays[row.muscle_group]) {
      muscleDays[row.muscle_group] = diff
    }
  }

  // Calendar data — last 60 days
  const [{ data: workoutDates }, { data: mealDates }] = await Promise.all([
    supabase.from('workouts').select('date').eq('user_id', user.id).gte('date', sixtyAgo),
    supabase.from('meals').select('date').eq('user_id', user.id).gte('date', sixtyAgo),
  ])

  const workoutSet = new Set((workoutDates ?? []).map(w => w.date))
  const mealSet    = new Set((mealDates   ?? []).map(m => m.date))
  const allDates   = Array.from(new Set([
    ...Array.from(workoutSet),
    ...Array.from(mealSet),
  ]))
  const calData    = allDates.map(date => ({
    date,
    workout: workoutSet.has(date),
    meals:   mealSet.has(date),
  }))

  return (
    <main className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto pt-8 space-y-6">
      <div className="animate-fadeIn">
        <span className="font-label text-[11px] text-elite-red font-bold tracking-[0.3em] uppercase">Progress</span>
        <h1 className="font-heading text-[44px] text-white tracking-wide mt-1 leading-none">Muscle & Consistency</h1>
      </div>

      {/* Muscle map */}
      <GlassCard padding="lg" className="animate-fadeIn [animation-delay:60ms]">
        <MuscleMapClient muscleDays={muscleDays} />
      </GlassCard>

      {/* Legend */}
      <GlassCard padding="md" className="animate-fadeIn [animation-delay:120ms]">
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
      <GlassCard padding="lg" className="animate-fadeIn [animation-delay:180ms]">
        <div className="mb-4">
          <span className="font-label text-[11px] text-elite-red font-bold tracking-[0.3em] uppercase">Consistency</span>
          <h2 className="font-heading text-[28px] text-white tracking-wide mt-1">Training Calendar</h2>
        </div>
        <CalendarClient data={calData} />
      </GlassCard>
    </main>
  )
}
