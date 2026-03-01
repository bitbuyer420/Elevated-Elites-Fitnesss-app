'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard }   from '@/components/GlassCard'
import { GlassButton } from '@/components/GlassButton'

// ── Types ─────────────────────────────────────────────────────
type ExerciseRow = {
  id: string; exercise_name: string
  sets: number; reps: number; weight: number | null
}
type HistoryWorkout = {
  id: string; date: string
  exercises: ExerciseRow[]
  muscles: string[]
}
type PR = { name: string; weight: number; sets: number; reps: number }
type MuscleEntry = { muscle_group: string; days_since: number }
type AISuggestion = {
  muscleGroups: string[]
  exercises: { name: string; sets: number; reps: string; weight_suggestion: string; notes: string }[]
  rationale: string
}

interface Props {
  userId:          string
  todayWorkoutId:  string | null
  initialExercises: ExerciseRow[]
  initialMuscles:  string[]
  recentWorkouts:  HistoryWorkout[]
  personalRecords: PR[]
  recentMuscles:   MuscleEntry[]
  goal:            string
  activityLevel:   string
}

const ALL_MUSCLES = ['chest','back','shoulders','biceps','triceps','abs','quads','hamstrings','glutes','calves']

const WEEKLY_SPLITS: Record<string, { split: string; days: string }> = {
  bulk:     { split: 'Push / Pull / Legs × 2',   days: '6 days/week' },
  shred:    { split: 'Full Body + HIIT',           days: '5–6 days/week' },
  maintain: { split: 'Upper / Lower Split × 2',   days: '4 days/week' },
  recomp:   { split: 'Full Body Compound Focus',  days: '3–4 days/week' },
}

export function WorkoutClient({
  userId, todayWorkoutId, initialExercises, initialMuscles,
  recentWorkouts, personalRecords, recentMuscles, goal, activityLevel,
}: Props) {
  const [workoutId,   setWorkoutId]   = useState<string | null>(todayWorkoutId)
  const [exercises,   setExercises]   = useState<ExerciseRow[]>(initialExercises)
  const [muscles,     setMuscles]     = useState<string[]>(initialMuscles)
  const [adding,      setAdding]      = useState(false)
  const [newEx,       setNewEx]       = useState({ name: '', sets: '3', reps: '10', weight: '' })
  const [savingEx,    setSavingEx]    = useState(false)
  const [suggestion,  setSuggestion]  = useState<AISuggestion | null>(null)
  const [aiLoading,   setAiLoading]   = useState(true)
  const [aiErr,       setAiErr]       = useState<string | null>(null)
  const [loadingAI,   setLoadingAI]   = useState(false)
  const [expanded,    setExpanded]    = useState<string | null>(null)
  const [muscleLoading, setMuscleLoading] = useState<string | null>(null)
  const supabase = createClient()

  // ── Fetch AI suggestion on mount ──────────────────────────
  const fetchSuggestion = useCallback(async () => {
    setAiLoading(true); setAiErr(null)
    try {
      const res = await fetch('/api/workout/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recentMuscles, goal, activityLevel }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'AI request failed')
      setSuggestion(data)
    } catch (e: unknown) {
      setAiErr((e as Error).message)
    }
    setAiLoading(false)
  }, [recentMuscles, goal, activityLevel])

  useEffect(() => { fetchSuggestion() }, [fetchSuggestion])

  // ── Ensure a workout row exists for today ─────────────────
  async function ensureWorkout(): Promise<string> {
    if (workoutId) return workoutId
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('workouts')
      .insert({ user_id: userId, date: today })
      .select('id')
      .single()
    if (error || !data) throw new Error(error?.message ?? 'Could not create workout')
    setWorkoutId(data.id)
    return data.id
  }

  // ── Add a single exercise ─────────────────────────────────
  async function addExercise() {
    if (!newEx.name.trim()) return
    setSavingEx(true)
    try {
      const wid = await ensureWorkout()
      const { data: item, error } = await supabase
        .from('workout_exercises')
        .insert({
          workout_id:    wid,
          exercise_name: newEx.name.trim(),
          sets:          parseInt(newEx.sets)  || 3,
          reps:          parseInt(newEx.reps)  || 10,
          weight:        newEx.weight ? parseFloat(newEx.weight) : null,
        })
        .select()
        .single()
      if (error || !item) throw new Error(error?.message)
      setExercises(prev => [...prev, item as ExerciseRow])
      setNewEx({ name: '', sets: '3', reps: '10', weight: '' })
      setAdding(false)
    } catch {
      // keep form open on error
    }
    setSavingEx(false)
  }

  // ── Delete an exercise ────────────────────────────────────
  async function deleteExercise(id: string) {
    await supabase.from('workout_exercises').delete().eq('id', id)
    setExercises(prev => prev.filter(e => e.id !== id))
  }

  // ── Toggle a muscle group tag ─────────────────────────────
  async function toggleMuscle(muscle: string) {
    setMuscleLoading(muscle)
    try {
      const wid = await ensureWorkout()
      if (muscles.includes(muscle)) {
        // Remove: delete row from workout_muscles
        await supabase
          .from('workout_muscles')
          .delete()
          .eq('workout_id', wid)
          .eq('muscle_group', muscle)
        setMuscles(prev => prev.filter(m => m !== muscle))
      } else {
        // Add: insert row
        await supabase
          .from('workout_muscles')
          .insert({ workout_id: wid, muscle_group: muscle })
        setMuscles(prev => [...prev, muscle])
      }
    } catch { /* silent */ }
    setMuscleLoading(null)
  }

  // ── Load all AI exercises in one batch ────────────────────
  async function loadAISuggestions() {
    if (!suggestion?.exercises?.length) return
    setLoadingAI(true)
    try {
      const wid = await ensureWorkout()

      // Add suggested muscle groups
      for (const mg of (suggestion.muscleGroups ?? [])) {
        if (!muscles.includes(mg)) {
          await supabase.from('workout_muscles').insert({ workout_id: wid, muscle_group: mg })
        }
      }
      setMuscles(prev => {
        const next = [...prev]
        for (const mg of suggestion.muscleGroups ?? []) {
          if (!next.includes(mg)) next.push(mg)
        }
        return next
      })

      // Insert exercises
      const toInsert = suggestion.exercises.map(ex => ({
        workout_id:    wid,
        exercise_name: ex.name,
        sets:          ex.sets,
        reps:          parseInt(ex.reps) || 10,
        weight:        null,
      }))
      const { data: inserted } = await supabase
        .from('workout_exercises')
        .insert(toInsert)
        .select()

      if (inserted) {
        setExercises(prev => [...prev, ...(inserted as ExerciseRow[])])
      }
    } catch { /* silent */ }
    setLoadingAI(false)
  }

  const fmt = (n: number) => Number.isInteger(n) ? n.toString() : n.toFixed(1)
  const split = WEEKLY_SPLITS[goal] ?? { split: 'Custom Program', days: '3–5 days/week' }

  return (
    <main className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto pt-8 space-y-5">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between animate-fadeIn">
        <div>
          <span className="font-label text-[11px] text-elite-red font-bold tracking-[0.3em] uppercase">Workout</span>
          <h1 className="font-heading text-[44px] text-white tracking-wide mt-1 leading-none">Training Log</h1>
        </div>
        {workoutId && (
          <span className="badge-red mt-2">Session Active</span>
        )}
      </div>

      {/* ── AI Suggestion ──────────────────────────────────── */}
      <GlassCard padding="lg" className="animate-fadeIn [animation-delay:60ms]" glow>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="font-label text-[11px] text-elite-red font-bold tracking-[0.3em] uppercase">AI Coach</span>
            <h2 className="font-heading text-[24px] text-white tracking-wide mt-0.5">Today&apos;s Recommendation</h2>
          </div>
          <button onClick={fetchSuggestion} className="btn-icon" aria-label="Refresh suggestion">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
          </button>
        </div>

        {aiLoading && (
          <div className="flex items-center gap-3 py-4">
            <svg className="animate-spin h-5 w-5 text-elite-red shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <p className="text-white/40 font-body text-sm">Analysing your recovery and planning today&apos;s session…</p>
          </div>
        )}

        {aiErr && !aiLoading && (
          <p className="text-red-400 text-sm font-body py-2">{aiErr}</p>
        )}

        {suggestion && !aiLoading && (
          <>
            {/* Muscle groups */}
            <div className="flex flex-wrap gap-2 mb-4">
              {(suggestion.muscleGroups ?? []).map(mg => (
                <span key={mg} className="badge-red capitalize">{mg.replace('_', ' ')}</span>
              ))}
            </div>

            {/* Exercises list */}
            <div className="space-y-2 mb-4">
              {(suggestion.exercises ?? []).map((ex, i) => (
                <div key={i} className="p-3 rounded-xl bg-white/4 border border-white/6">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-label font-semibold text-sm text-white">{ex.name}</p>
                    <span className="text-white/35 font-label text-xs shrink-0">
                      {ex.sets}×{ex.reps}
                    </span>
                  </div>
                  {ex.notes && (
                    <p className="text-white/30 text-xs font-body mt-1">{ex.notes}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Rationale */}
            {suggestion.rationale && (
              <p className="text-white/35 text-xs font-body italic mb-4 border-l-2 border-elite-red/40 pl-3">
                {suggestion.rationale}
              </p>
            )}

            <GlassButton
              variant="glass"
              onClick={loadAISuggestions}
              loading={loadingAI}
              style={{ width: 'auto', padding: '11px 20px' }}
            >
              Load into Logger
            </GlassButton>
          </>
        )}
      </GlassCard>

      {/* ── Today's Workout Logger ─────────────────────────── */}
      <GlassCard padding="lg" className="animate-fadeIn [animation-delay:120ms]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-[24px] text-white tracking-wide">Today&apos;s Session</h2>
          <button
            onClick={() => { setAdding(a => !a); setNewEx({ name: '', sets: '3', reps: '10', weight: '' }) }}
            className="btn-icon"
            aria-label="Add exercise"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>

        {/* Muscle group tags */}
        <div className="mb-4">
          <p className="font-label text-[11px] text-white/35 uppercase tracking-wider mb-2">Muscles Trained</p>
          <div className="flex flex-wrap gap-2">
            {ALL_MUSCLES.map(muscle => (
              <button
                key={muscle}
                onClick={() => toggleMuscle(muscle)}
                disabled={muscleLoading === muscle}
                className={`px-3 py-1 rounded-lg font-label text-xs font-semibold uppercase tracking-wide border transition-all ${
                  muscles.includes(muscle)
                    ? 'bg-elite-red/15 border-elite-red/40 text-elite-red'
                    : 'bg-white/4 border-white/8 text-white/35 hover:text-white/60 hover:border-white/20'
                } ${muscleLoading === muscle ? 'opacity-50' : ''}`}
              >
                {muscle.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="divider-red mb-4" />

        {/* Exercise list */}
        {exercises.length > 0 && (
          <div className="space-y-2 mb-4">
            {exercises.map(ex => (
              <div key={ex.id} className="flex items-center justify-between p-3 rounded-xl bg-white/4 border border-white/6 group">
                <div className="flex-1 min-w-0">
                  <p className="font-label font-semibold text-sm text-white capitalize">{ex.exercise_name}</p>
                  <p className="text-white/35 text-xs font-body mt-0.5">
                    {ex.sets} sets × {ex.reps} reps
                    {ex.weight ? ` @ ${fmt(ex.weight)} kg` : ' (bodyweight)'}
                  </p>
                </div>
                <button
                  onClick={() => deleteExercise(ex.id)}
                  className="ml-2 opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all"
                  aria-label="Delete exercise"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                    <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {exercises.length === 0 && !adding && (
          <p className="text-white/20 text-sm font-body text-center py-4">
            No exercises yet. Add one or load the AI recommendation.
          </p>
        )}

        {/* Add exercise form */}
        {adding && (
          <div className="border border-white/8 rounded-xl p-4 space-y-3 bg-white/2">
            <p className="font-label text-xs text-white/40 uppercase tracking-wider">New Exercise</p>
            <input
              className="glass-input"
              placeholder="Exercise name (e.g. Bench Press)"
              value={newEx.name}
              onChange={e => setNewEx(p => ({ ...p, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addExercise()}
              autoFocus
            />
            <div className="grid grid-cols-3 gap-2">
              <div className="relative">
                <input
                  className="glass-input pr-8"
                  type="number" min="1" max="20"
                  placeholder="Sets"
                  value={newEx.sets}
                  onChange={e => setNewEx(p => ({ ...p, sets: e.target.value }))}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs font-label">sets</span>
              </div>
              <div className="relative">
                <input
                  className="glass-input pr-8"
                  type="number" min="1" max="100"
                  placeholder="Reps"
                  value={newEx.reps}
                  onChange={e => setNewEx(p => ({ ...p, reps: e.target.value }))}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs font-label">reps</span>
              </div>
              <div className="relative">
                <input
                  className="glass-input pr-8"
                  type="number" min="0" step="0.5"
                  placeholder="0"
                  value={newEx.weight}
                  onChange={e => setNewEx(p => ({ ...p, weight: e.target.value }))}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs font-label">kg</span>
              </div>
            </div>
            <div className="flex gap-2">
              <GlassButton
                onClick={addExercise}
                loading={savingEx}
                style={{ flex: 1, padding: '11px 16px' }}
              >
                Add Exercise
              </GlassButton>
              <button onClick={() => setAdding(false)} className="btn-glass" style={{ padding: '11px 16px' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* ── Goals + Split ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeIn [animation-delay:180ms]">
        <GlassCard padding="lg">
          <span className="font-label text-[11px] text-elite-red font-bold tracking-[0.3em] uppercase">Your Goal</span>
          <p className="font-heading text-[28px] text-white tracking-wide mt-1 capitalize">
            {goal || 'Not set'}
          </p>
          <div className="divider-red mt-3 mb-3" />
          <p className="font-label text-xs text-white/40 uppercase tracking-wider mb-1">Recommended Split</p>
          <p className="font-label font-semibold text-sm text-white">{split.split}</p>
          <p className="text-white/35 text-xs font-body mt-0.5">{split.days}</p>
        </GlassCard>

        {/* Personal Records */}
        <GlassCard padding="lg">
          <span className="font-label text-[11px] text-elite-red font-bold tracking-[0.3em] uppercase">Personal Records</span>
          <h3 className="font-heading text-[20px] text-white tracking-wide mt-1 mb-3">90-Day PRs</h3>
          {personalRecords.length === 0 ? (
            <p className="text-white/20 text-sm font-body">No records yet. Start lifting!</p>
          ) : (
            <div className="space-y-2">
              {personalRecords.slice(0, 5).map(pr => (
                <div key={pr.name} className="flex items-center justify-between">
                  <p className="font-label text-sm text-white/70 truncate pr-2">{pr.name}</p>
                  <span className="font-heading text-[16px] text-elite-red shrink-0">
                    {fmt(pr.weight)} kg
                  </span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* ── Recent History ──────────────────────────────────── */}
      {recentWorkouts.length > 0 && (
        <GlassCard padding="lg" className="animate-fadeIn [animation-delay:240ms]">
          <span className="font-label text-[11px] text-elite-red font-bold tracking-[0.3em] uppercase">History</span>
          <h2 className="font-heading text-[24px] text-white tracking-wide mt-1 mb-4">Recent Sessions</h2>

          <div className="space-y-3">
            {recentWorkouts.map(w => {
              const isOpen = expanded === w.id
              return (
                <div key={w.id} className="border border-white/8 rounded-xl overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-white/3 transition-colors"
                    onClick={() => setExpanded(isOpen ? null : w.id)}
                  >
                    <div>
                      <p className="font-label font-semibold text-sm text-white">
                        {new Date(w.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-white/30 text-xs font-body mt-0.5">
                        {w.exercises.length} exercise{w.exercises.length !== 1 ? 's' : ''}
                        {w.muscles.length > 0 ? ` · ${w.muscles.slice(0, 2).join(', ')}` : ''}
                      </p>
                    </div>
                    <svg
                      width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="rgba(255,255,255,0.3)" strokeWidth="2"
                      className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    >
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 space-y-1.5">
                      {w.exercises.map(ex => (
                        <div key={ex.id} className="flex items-center justify-between text-sm">
                          <span className="text-white/60 font-body">{ex.exercise_name}</span>
                          <span className="text-white/30 font-label text-xs">
                            {ex.sets}×{ex.reps}{ex.weight ? ` @ ${fmt(ex.weight)}kg` : ''}
                          </span>
                        </div>
                      ))}
                      {w.exercises.length === 0 && (
                        <p className="text-white/20 text-xs font-body">No exercises recorded.</p>
                      )}
                      {w.muscles.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {w.muscles.map(m => (
                            <span key={m} className="badge-red capitalize">{m.replace('_', ' ')}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </GlassCard>
      )}
    </main>
  )
}
