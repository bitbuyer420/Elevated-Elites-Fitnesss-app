import { createClient } from '@/lib/supabase/server'
import { GlassCard }    from '@/components/GlassCard'
import { CalorieRing }  from '@/components/CalorieRing'
import { MacroBar }     from '@/components/MacroBar'
import Link from 'next/link'

const QUOTES = [
  { text: 'The iron never lies to you.',                               author: 'Henry Rollins' },
  { text: 'Pain is temporary. Quitting lasts forever.',                author: 'Lance Armstrong' },
  { text: 'Fall seven times, stand up eight.',                         author: 'Japanese Proverb' },
  { text: 'Discipline is the bridge between goals and accomplishment.', author: 'Jim Rohn' },
  { text: 'The samurai has no goal — only a path.',                    author: 'Ancient Proverb' },
  { text: 'Strength does not come from the body. It comes from the will.', author: 'Gandhi' },
  { text: 'We must all suffer one of two things: discipline or regret.', author: 'Jim Rohn' },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today  = new Date().toISOString().split('T')[0]
  const hour   = new Date().getUTCHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const quote  = QUOTES[Math.floor(Date.now() / 86_400_000) % QUOTES.length]

  // ── Fetch all data in parallel ──────────────────────────
  const [profileRes, goalsRes, mealsRes, todayWorkoutRes, recentWorkoutsRes, workoutsHist, mealsHist] =
    await Promise.all([
      supabase.from('profiles').select('name, fitness_goal').eq('user_id', user.id).single(),
      supabase.from('daily_goals').select('*').eq('user_id', user.id).single(),
      supabase.from('meals').select('meal_items(calories,protein,carbs,fat)').eq('user_id', user.id).eq('date', today),
      supabase.from('workouts').select('id, notes, workout_exercises(exercise_name,sets,reps,weight), workout_muscles(muscle_group)').eq('user_id', user.id).eq('date', today).limit(1).maybeSingle(),
      supabase.from('workouts').select('id, date, notes, workout_exercises(exercise_name,sets,reps,weight), workout_muscles(muscle_group)').eq('user_id', user.id).order('date', { ascending: false }).limit(4),
      // last 60 days for streak
      supabase.from('workouts').select('date').eq('user_id', user.id).gte('date', new Date(Date.now() - 60 * 864e5).toISOString().split('T')[0]),
      supabase.from('meals').select('date').eq('user_id', user.id).gte('date', new Date(Date.now() - 60 * 864e5).toISOString().split('T')[0]),
    ])

  const profile = profileRes.data
  const goals   = goalsRes.data
  const todayWorkout = todayWorkoutRes.data

  // Aggregate today's nutrition
  const nutrition = (mealsRes.data ?? []).reduce(
    (acc, meal) => {
      ;(meal.meal_items as { calories: number; protein: number; carbs: number; fat: number }[] ?? []).forEach(i => {
        acc.calories += i.calories ?? 0
        acc.protein  += i.protein  ?? 0
        acc.carbs    += i.carbs    ?? 0
        acc.fat      += i.fat      ?? 0
      })
      return acc
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  // Streak calculation
  const workoutDays = new Set((workoutsHist.data ?? []).map(w => w.date))
  const mealDays    = new Set((mealsHist.data ?? []).map(m => m.date))
  let streak = 0
  for (let i = 0; i <= 60; i++) {
    const d = new Date(Date.now() - i * 864e5).toISOString().split('T')[0]
    if (workoutDays.has(d) && mealDays.has(d)) streak++
    else if (i > 0) break
  }

  const recentWorkouts = (recentWorkoutsRes.data ?? []).filter(w => w.id !== todayWorkout?.id).slice(0, 3)
  const displayName    = profile?.name || user.email?.split('@')[0] || 'Elite'

  return (
    <main className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto pt-8">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="mb-8 animate-fadeIn">
        <span className="font-label text-[11px] text-elite-red font-bold tracking-[0.3em] uppercase">Dashboard</span>
        <h1 className="font-heading text-[44px] sm:text-[56px] text-white tracking-wide mt-1 leading-none">
          {greeting},{' '}
          <span className="text-red-gradient">{displayName}</span>
        </h1>
        <p className="text-white/35 font-body text-sm mt-2">Rise. Grind. Elevate.</p>
      </div>

      {/* ── Calorie Ring + Macros ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-4 mb-4 animate-fadeIn [animation-delay:60ms]">
        <GlassCard padding="lg" className="flex flex-col items-center gap-4 glass-card-glow">
          <CalorieRing consumed={Math.round(nutrition.calories)} goal={goals?.calorie_goal ?? 2000} size={180} />
          <p className="font-label text-xs text-white/35 uppercase tracking-widest">
            {goals?.calorie_goal ? `${Math.max(0, (goals.calorie_goal - nutrition.calories)).toFixed(0)} kcal remaining` : 'Set your calorie goal in profile'}
          </p>
        </GlassCard>

        <GlassCard padding="lg" className="flex flex-col justify-center gap-5">
          <div>
            <p className="font-label text-[11px] text-white/40 uppercase tracking-wider mb-3">Today&apos;s Macros</p>
            <div className="space-y-4">
              <MacroBar label="Protein" consumed={Math.round(nutrition.protein)} goal={goals?.protein_goal ?? 150} color="#CC0000" />
              <MacroBar label="Carbs"   consumed={Math.round(nutrition.carbs)}   goal={goals?.carb_goal    ?? 250} color="#5588CC" />
              <MacroBar label="Fat"     consumed={Math.round(nutrition.fat)}     goal={goals?.fat_goal     ?? 65}  color="#CC8822" />
            </div>
          </div>
          <Link href="/nutrition" className="btn-red text-center no-underline" style={{ width: '100%' }}>
            Log Food
          </Link>
        </GlassCard>
      </div>

      {/* ── Stats Row ───────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 animate-fadeIn [animation-delay:120ms]">
        {[
          { label: 'Streak', value: streak.toString(), sub: 'days', icon: '🔥' },
          { label: 'Goal',   value: profile?.fitness_goal ? profile.fitness_goal.charAt(0).toUpperCase() + profile.fitness_goal.slice(1) : '—', sub: 'current goal', icon: '🎯' },
          { label: 'Workouts', value: workoutDays.size.toString(), sub: 'last 60 days', icon: '💪' },
          { label: 'Today',    value: todayWorkout ? '✓' : '—', sub: todayWorkout ? 'workout logged' : 'no workout yet', icon: '📋' },
        ].map(s => (
          <GlassCard key={s.label} padding="md" className="text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <p className="font-heading text-[26px] text-white leading-none">{s.value}</p>
            <p className="font-label text-[11px] text-white/35 uppercase tracking-wide mt-1">{s.label}</p>
          </GlassCard>
        ))}
      </div>

      {/* ── Today's Workout ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 animate-fadeIn [animation-delay:180ms]">
        <GlassCard padding="lg" glow>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-[22px] text-white tracking-wide">Today&apos;s Workout</h3>
            {todayWorkout && <span className="badge-red">Done</span>}
          </div>

          {todayWorkout ? (
            <>
              {(todayWorkout.workout_muscles as { muscle_group: string }[] ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(todayWorkout.workout_muscles as { muscle_group: string }[]).map(m => (
                    <span key={m.muscle_group} className="badge-red capitalize">{m.muscle_group.replace('_',' ')}</span>
                  ))}
                </div>
              )}
              <div className="space-y-1.5">
                {(todayWorkout.workout_exercises as { exercise_name: string; sets: number; reps: number; weight: number }[] ?? []).slice(0,4).map((ex, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-white/70 font-body">{ex.exercise_name}</span>
                    <span className="text-white/35 font-label text-xs">
                      {ex.sets}×{ex.reps}{ex.weight ? ` @ ${ex.weight}kg` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-white/35 text-sm font-body mb-4">No session logged yet. Push hard today.</p>
          )}

          <div className="divider-red mt-4 mb-4" />
          <Link href="/workout" className="btn-red text-center no-underline block">
            {todayWorkout ? 'Edit Workout' : 'Log Workout'}
          </Link>
        </GlassCard>

        {/* Quote card */}
        <GlassCard padding="lg" as="blockquote" className="flex flex-col justify-between">
          <div className="flex gap-4">
            <div className="w-0.5 rounded-full bg-gradient-to-b from-elite-red via-elite-red/40 to-transparent shrink-0 self-stretch" />
            <p className="text-white/65 font-body text-base leading-relaxed italic">&ldquo;{quote.text}&rdquo;</p>
          </div>
          <footer className="text-white/25 font-label text-xs uppercase tracking-widest mt-4">— {quote.author}</footer>
        </GlassCard>
      </div>

      {/* ── Recent Workouts ─────────────────────────────── */}
      {recentWorkouts.length > 0 && (
        <GlassCard padding="lg" className="mb-4 animate-fadeIn [animation-delay:240ms]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-[22px] text-white tracking-wide">Recent Activity</h3>
            <Link href="/progress" className="text-elite-red text-xs font-label font-semibold tracking-wide hover:text-[#FF2222] transition-colors">
              View All →
            </Link>
          </div>
          <div className="space-y-3">
            {recentWorkouts.map(w => (
              <div key={w.id} className="flex items-center justify-between p-3 rounded-xl bg-white/4 border border-white/6">
                <div>
                  <p className="font-label text-sm font-semibold text-white">
                    {new Date(w.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-white/35 text-xs font-body mt-0.5">
                    {(w.workout_exercises as { exercise_name: string }[] ?? []).slice(0,3).map(e => e.exercise_name).join(', ') || 'No exercises'}
                  </p>
                </div>
                <div className="flex gap-1">
                  {(w.workout_muscles as { muscle_group: string }[] ?? []).slice(0,2).map(m => (
                    <span key={m.muscle_group} className="badge-red capitalize">{m.muscle_group.replace('_',' ')}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </main>
  )
}
