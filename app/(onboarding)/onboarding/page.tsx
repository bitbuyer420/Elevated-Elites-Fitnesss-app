'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard }   from '@/components/GlassCard'
import { GlassButton } from '@/components/GlassButton'
import {
  calculateTDEE, calculateTargetCalories, calculateMacros,
  lbsToKg, ftInToCm,
  type Gender, type Goal, type ActivityLevel,
} from '@/lib/tdee'

const TOTAL_STEPS = 7

type State = {
  name:          string
  username:      string
  age:           string
  gender:        Gender | ''
  heightUnit:    'ft' | 'cm'
  heightFt:      string
  heightIn:      string
  heightCm:      string
  weightUnit:    'lbs' | 'kg'
  weight:        string
  goal:          Goal | ''
  activityLevel: ActivityLevel | ''
}

const GOALS: { id: Goal; label: string; desc: string; emoji: string }[] = [
  { id: 'bulk',     label: 'Bulk',     emoji: '💪', desc: 'Build maximum muscle with a caloric surplus. Expect size and strength gains.' },
  { id: 'shred',    label: 'Shred',    emoji: '🔥', desc: 'Burn fat while preserving muscle in a caloric deficit. Get lean and defined.' },
  { id: 'maintain', label: 'Maintain', emoji: '⚖️', desc: 'Stay at your current weight. Keep performance and body composition stable.' },
  { id: 'recomp',   label: 'Recomp',   emoji: '🎯', desc: 'Build muscle and lose fat simultaneously. Ideal for beginners and intermediates.' },
]

const ACTIVITY: { id: ActivityLevel; label: string; desc: string }[] = [
  { id: 'sedentary',          label: 'Sedentary',          desc: 'Desk job, little to no exercise' },
  { id: 'lightly_active',     label: 'Lightly Active',     desc: '1–3 workouts per week' },
  { id: 'moderately_active',  label: 'Moderately Active',  desc: '3–5 workouts per week' },
  { id: 'very_active',        label: 'Very Active',        desc: '6–7 intense workouts per week' },
]

export default function OnboardingPage() {
  const [step,    setStep]    = useState(1)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [state,   setState]   = useState<State>({
    name: '', username: '', age: '',
    gender: '',
    heightUnit: 'ft', heightFt: '5', heightIn: '10',
    heightCm: '178',
    weightUnit: 'lbs', weight: '175',
    goal: '', activityLevel: '',
  })

  const set = (k: keyof State, v: string) => setState(s => ({ ...s, [k]: v }))

  // Derived values for the summary step
  const weightKg  = state.weightUnit === 'lbs' ? lbsToKg(Number(state.weight)) : Number(state.weight)
  const heightCm  = state.heightUnit === 'ft'
    ? ftInToCm(Number(state.heightFt), Number(state.heightIn))
    : Number(state.heightCm)
  const tdee       = (state.gender && state.activityLevel)
    ? calculateTDEE({ gender: state.gender as Gender, weightKg, heightCm, age: Number(state.age) || 25, activityLevel: state.activityLevel as ActivityLevel })
    : 0
  const targetCals = state.goal ? calculateTargetCalories(tdee, state.goal as Goal) : 0
  const macros     = state.goal ? calculateMacros({ targetCalories: targetCals, weightKg, goal: state.goal as Goal }) : null

  async function finish() {
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Session expired. Please log in again.'); setSaving(false); return }

    const profileUpdate = {
      user_id:              user.id,
      name:                 state.name.trim(),
      username:             state.username.trim().toLowerCase() || null,
      age:                  Number(state.age) || null,
      gender:               state.gender || null,
      weight:               weightKg,
      height:               heightCm,
      fitness_goal:         state.goal || null,
      activity_level:       state.activityLevel || null,
      onboarding_completed: true,
    }

    const { error: pErr } = await supabase
      .from('profiles')
      .upsert(profileUpdate, { onConflict: 'user_id' })

    if (pErr) { setError(pErr.message); setSaving(false); return }

    if (macros) {
      await supabase.from('daily_goals').upsert({
        user_id:      user.id,
        calorie_goal: targetCals,
        protein_goal: macros.protein,
        carb_goal:    macros.carbs,
        fat_goal:     macros.fat,
      }, { onConflict: 'user_id' })
    }

    window.location.href = '/dashboard'
  }

  const canNext: Record<number, boolean> = {
    1: true,
    2: state.name.trim().length > 0 && state.age.length > 0,
    3: state.gender !== '',
    4: (state.heightUnit === 'ft'
      ? (Number(state.heightFt) > 0)
      : (Number(state.heightCm) > 0)) && Number(state.weight) > 0,
    5: state.goal !== '',
    6: state.activityLevel !== '',
    7: true,
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      {/* Progress bar */}
      {step > 1 && (
        <div className="w-full max-w-[480px] mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label text-xs text-white/35 uppercase tracking-wider">Step {step} of {TOTAL_STEPS}</span>
            <span className="font-label text-xs text-white/35">{Math.round((step / TOTAL_STEPS) * 100)}%</span>
          </div>
          <div className="h-1 rounded-full bg-white/8 overflow-hidden">
            <div
              className="h-full rounded-full bg-elite-red transition-all duration-500"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%`, boxShadow: '0 0 8px rgba(204,0,0,0.6)' }}
            />
          </div>
        </div>
      )}

      <div className="w-full max-w-[480px] animate-scaleIn">
        {/* ── Step 1: Welcome ──────────────────────────── */}
        {step === 1 && (
          <GlassCard padding="xl" className="text-center shadow-glass-lg">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-elite-red shadow-red-lg mb-6 relative">
              <span className="font-heading text-white text-4xl">EE</span>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
            </div>
            <h1 className="font-heading text-[42px] text-white tracking-wide mb-3">
              Elevated <span className="text-elite-red">Elites</span>
            </h1>
            <p className="text-white/50 font-body leading-relaxed mb-2">
              Your elite fitness journey starts now.
            </p>
            <p className="text-white/30 text-sm font-body mb-8">
              Let&apos;s set up your profile so we can calculate your perfect calorie target and macro split.
            </p>
            <div className="divider-red mb-8" />
            <GlassButton fullWidth onClick={() => setStep(2)}>
              Let&apos;s Begin →
            </GlassButton>
          </GlassCard>
        )}

        {/* ── Step 2: Name / Username / Age ────────────── */}
        {step === 2 && (
          <GlassCard padding="lg" className="shadow-glass-lg">
            <h2 className="font-heading text-[32px] text-white tracking-wide mb-1">Who are you?</h2>
            <p className="text-white/40 text-sm font-body mb-6">Tell us your name and age.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-label font-semibold text-white/50 mb-2 tracking-[0.12em] uppercase">Full Name *</label>
                <input className="glass-input" placeholder="Alex Johnson" value={state.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div>
                <label className="block text-[12px] font-label font-semibold text-white/50 mb-2 tracking-[0.12em] uppercase">Username (optional)</label>
                <input className="glass-input" placeholder="elitealex" value={state.username} onChange={e => set('username', e.target.value)} />
              </div>
              <div>
                <label className="block text-[12px] font-label font-semibold text-white/50 mb-2 tracking-[0.12em] uppercase">Age *</label>
                <input className="glass-input" type="number" placeholder="25" min="13" max="100" value={state.age} onChange={e => set('age', e.target.value)} />
              </div>
            </div>
          </GlassCard>
        )}

        {/* ── Step 3: Gender ────────────────────────────── */}
        {step === 3 && (
          <GlassCard padding="lg" className="shadow-glass-lg">
            <h2 className="font-heading text-[32px] text-white tracking-wide mb-1">Your biological sex</h2>
            <p className="text-white/40 text-sm font-body mb-6">Used to accurately calculate your metabolic rate.</p>
            <div className="grid grid-cols-2 gap-4">
              {(['male','female'] as Gender[]).map(g => (
                <button
                  key={g}
                  onClick={() => set('gender', g)}
                  className={`p-6 rounded-2xl border text-center transition-all duration-150 ${
                    state.gender === g
                      ? 'border-elite-red bg-elite-red/15 shadow-red-sm'
                      : 'border-white/8 bg-white/4 hover:bg-white/7'
                  }`}
                >
                  <div className="text-4xl mb-3">{g === 'male' ? '♂' : '♀'}</div>
                  <p className="font-heading text-[22px] text-white tracking-wide capitalize">{g}</p>
                </button>
              ))}
            </div>
          </GlassCard>
        )}

        {/* ── Step 4: Height + Weight ───────────────────── */}
        {step === 4 && (
          <GlassCard padding="lg" className="shadow-glass-lg">
            <h2 className="font-heading text-[32px] text-white tracking-wide mb-1">Your measurements</h2>
            <p className="text-white/40 text-sm font-body mb-6">Height and weight determine your caloric needs.</p>
            <div className="space-y-5">
              {/* Height */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[12px] font-label font-semibold text-white/50 tracking-[0.12em] uppercase">Height</label>
                  <div className="flex rounded-lg overflow-hidden border border-white/10">
                    {(['ft','cm'] as const).map(u => (
                      <button key={u} onClick={() => set('heightUnit', u)}
                        className={`px-3 py-1 text-xs font-label font-semibold uppercase tracking-wide transition-colors ${state.heightUnit === u ? 'bg-elite-red text-white' : 'text-white/40 hover:text-white'}`}>
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                {state.heightUnit === 'ft' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <input className="glass-input pr-8" type="number" placeholder="5" min="3" max="8" value={state.heightFt} onChange={e => set('heightFt', e.target.value)} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-sm font-label">ft</span>
                    </div>
                    <div className="relative">
                      <input className="glass-input pr-8" type="number" placeholder="10" min="0" max="11" value={state.heightIn} onChange={e => set('heightIn', e.target.value)} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-sm font-label">in</span>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <input className="glass-input pr-8" type="number" placeholder="178" min="100" max="250" value={state.heightCm} onChange={e => set('heightCm', e.target.value)} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-sm font-label">cm</span>
                  </div>
                )}
              </div>

              {/* Weight */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[12px] font-label font-semibold text-white/50 tracking-[0.12em] uppercase">Weight</label>
                  <div className="flex rounded-lg overflow-hidden border border-white/10">
                    {(['lbs','kg'] as const).map(u => (
                      <button key={u} onClick={() => set('weightUnit', u)}
                        className={`px-3 py-1 text-xs font-label font-semibold uppercase tracking-wide transition-colors ${state.weightUnit === u ? 'bg-elite-red text-white' : 'text-white/40 hover:text-white'}`}>
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="relative">
                  <input className="glass-input pr-10" type="number" placeholder={state.weightUnit === 'lbs' ? '175' : '80'} min="30" max="400" value={state.weight} onChange={e => set('weight', e.target.value)} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-sm font-label">{state.weightUnit}</span>
                </div>
              </div>
            </div>
          </GlassCard>
        )}

        {/* ── Step 5: Goal ──────────────────────────────── */}
        {step === 5 && (
          <GlassCard padding="lg" className="shadow-glass-lg">
            <h2 className="font-heading text-[32px] text-white tracking-wide mb-1">Your goal</h2>
            <p className="text-white/40 text-sm font-body mb-6">Choose what you&apos;re training towards.</p>
            <div className="space-y-3">
              {GOALS.map(({ id, label, desc, emoji }) => (
                <button key={id} onClick={() => set('goal', id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-150 ${
                    state.goal === id
                      ? 'border-elite-red bg-elite-red/12 shadow-red-sm'
                      : 'border-white/8 bg-white/4 hover:bg-white/7'
                  }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{emoji}</span>
                    <div>
                      <p className="font-heading text-[20px] text-white tracking-wide">{label}</p>
                      <p className="text-white/40 text-xs font-body mt-0.5">{desc}</p>
                    </div>
                    {state.goal === id && (
                      <svg className="ml-auto shrink-0 text-elite-red" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </GlassCard>
        )}

        {/* ── Step 6: Activity Level ────────────────────── */}
        {step === 6 && (
          <GlassCard padding="lg" className="shadow-glass-lg">
            <h2 className="font-heading text-[32px] text-white tracking-wide mb-1">Activity level</h2>
            <p className="text-white/40 text-sm font-body mb-6">How active are you outside this app?</p>
            <div className="space-y-3">
              {ACTIVITY.map(({ id, label, desc }) => (
                <button key={id} onClick={() => set('activityLevel', id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-150 ${
                    state.activityLevel === id
                      ? 'border-elite-red bg-elite-red/12 shadow-red-sm'
                      : 'border-white/8 bg-white/4 hover:bg-white/7'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-heading text-[20px] text-white tracking-wide">{label}</p>
                      <p className="text-white/40 text-xs font-body mt-0.5">{desc}</p>
                    </div>
                    {state.activityLevel === id && (
                      <svg className="shrink-0 text-elite-red" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </GlassCard>
        )}

        {/* ── Step 7: Summary ───────────────────────────── */}
        {step === 7 && (
          <GlassCard padding="lg" className="shadow-glass-lg">
            <h2 className="font-heading text-[32px] text-white tracking-wide mb-1">Your plan</h2>
            <p className="text-white/40 text-sm font-body mb-6">
              Based on your stats, here&apos;s your personalised daily target.
            </p>

            {/* TDEE + Target */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="glass-card p-4 glass-card-glow text-center">
                <p className="font-label text-xs text-white/40 uppercase tracking-wider mb-1">Maintenance</p>
                <p className="font-heading text-[28px] text-white">{tdee.toLocaleString()}</p>
                <p className="font-label text-xs text-white/30">kcal / day</p>
              </div>
              <div className="glass-card p-4 text-center" style={{ borderColor: 'rgba(204,0,0,0.3)', boxShadow: '0 0 16px rgba(204,0,0,0.15)' }}>
                <p className="font-label text-xs text-elite-red uppercase tracking-wider mb-1">Your Target</p>
                <p className="font-heading text-[28px] text-white">{targetCals.toLocaleString()}</p>
                <p className="font-label text-xs text-white/30">kcal / day</p>
              </div>
            </div>

            {/* Macros */}
            {macros && (
              <div className="glass-card p-4 mb-5">
                <p className="font-label text-xs text-white/40 uppercase tracking-wider mb-3">Daily Macros</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: 'Protein', value: macros.protein, color: '#CC0000' },
                    { label: 'Carbs',   value: macros.carbs,   color: '#6688AA' },
                    { label: 'Fat',     value: macros.fat,     color: '#AA7722' },
                  ].map(m => (
                    <div key={m.label}>
                      <p className="font-heading text-[24px] text-white" style={{ color: m.color }}>{m.value}g</p>
                      <p className="font-label text-xs text-white/40 uppercase tracking-wide">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary row */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { label: 'Goal', value: state.goal },
                { label: 'Weight', value: `${weightKg.toFixed(1)} kg` },
                { label: 'Height', value: `${heightCm} cm` },
              ].map(i => (
                <span key={i.label} className="badge-red capitalize">{i.label}: {i.value}</span>
              ))}
            </div>

            {error && <div className="alert-error mb-4" role="alert">{error}</div>}

            <GlassButton fullWidth loading={saving} onClick={finish}>
              Start Training →
            </GlassButton>
          </GlassCard>
        )}

        {/* Navigation buttons */}
        {step > 1 && (
          <div className="flex gap-3 mt-4">
            <button onClick={() => setStep(s => s - 1)}
              className="btn-glass flex-1">
              ← Back
            </button>
            {step < TOTAL_STEPS && (
              <GlassButton
                className="flex-1"
                onClick={() => canNext[step] && setStep(s => s + 1)}
                style={{ opacity: canNext[step] ? 1 : 0.4, cursor: canNext[step] ? 'pointer' : 'not-allowed' }}
              >
                Next →
              </GlassButton>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
