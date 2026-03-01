'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard }   from '@/components/GlassCard'
import { GlassButton } from '@/components/GlassButton'
import {
  calculateTDEE, calculateTargetCalories, calculateMacros,
  lbsToKg, ftInToCm,
  type Gender, type Goal, type ActivityLevel,
} from '@/lib/tdee'

// ── Types ─────────────────────────────────────────────────────
type Profile = {
  name?:           string | null
  username?:       string | null
  age?:            number | null
  gender?:         string | null
  weight?:         number | null   // kg
  height?:         number | null   // cm
  fitness_goal?:   string | null
  activity_level?: string | null
} | null

type Goals = {
  calorie_goal?: number | null
  protein_goal?: number | null
  carb_goal?:    number | null
  fat_goal?:     number | null
} | null

interface Props {
  userId:       string
  email:        string
  profile:      Profile
  goals:        Goals
  workoutCount: number
  mealCount:    number
}

const GOAL_LABELS: Record<string, string> = {
  bulk: 'Bulk', shred: 'Shred', maintain: 'Maintain', recomp: 'Recomp',
}
const ACTIVITY_LABELS: Record<string, string> = {
  sedentary:         'Sedentary',
  lightly_active:    'Lightly Active',
  moderately_active: 'Moderately Active',
  very_active:       'Very Active',
}

const GOALS: { id: Goal; label: string }[] = [
  { id: 'bulk',     label: 'Bulk'     },
  { id: 'shred',    label: 'Shred'    },
  { id: 'maintain', label: 'Maintain' },
  { id: 'recomp',   label: 'Recomp'   },
]
const ACTIVITY: { id: ActivityLevel; label: string }[] = [
  { id: 'sedentary',         label: 'Sedentary'         },
  { id: 'lightly_active',    label: 'Lightly Active'    },
  { id: 'moderately_active', label: 'Moderately Active' },
  { id: 'very_active',       label: 'Very Active'       },
]

export function ProfileClient({ userId, email, profile, goals, workoutCount, mealCount }: Props) {
  const [editing,   setEditing]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [success,   setSuccess]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const supabase = createClient()

  // Edit form state (initialised from profile)
  const [form, setForm] = useState({
    name:          profile?.name          ?? '',
    age:           profile?.age?.toString() ?? '',
    gender:        (profile?.gender         ?? '') as Gender | '',
    weight:        profile?.weight?.toString() ?? '',  // kg
    height:        profile?.height?.toString() ?? '', // cm
    goal:          (profile?.fitness_goal   ?? '') as Goal | '',
    activityLevel: (profile?.activity_level ?? '') as ActivityLevel | '',
  })

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  // Derived display values
  const weightLbs = profile?.weight ? Math.round(profile.weight * 2.20462) : null
  const heightFt  = profile?.height ? Math.floor(profile.height / 30.48) : null
  const heightIn  = profile?.height ? Math.round((profile.height % 30.48) / 2.54) : null

  async function saveProfile() {
    setSaving(true); setError(null); setSuccess(false)

    const weightKg = parseFloat(form.weight)
    const heightCm = parseFloat(form.height)
    const age      = parseInt(form.age) || null

    const profileUpdate = {
      user_id:        userId,
      name:           form.name.trim() || null,
      age,
      gender:         form.gender  || null,
      weight:         isNaN(weightKg) ? null : weightKg,
      height:         isNaN(heightCm) ? null : heightCm,
      fitness_goal:   form.goal          || null,
      activity_level: form.activityLevel || null,
    }

    const { error: pErr } = await supabase
      .from('profiles')
      .upsert(profileUpdate, { onConflict: 'user_id' })

    if (pErr) { setError(pErr.message); setSaving(false); return }

    // Recalculate and save daily goals if we have enough data
    if (form.gender && form.activityLevel && form.goal && !isNaN(weightKg) && !isNaN(heightCm) && age) {
      const tdee = calculateTDEE({
        gender:        form.gender as Gender,
        weightKg,
        heightCm,
        age,
        activityLevel: form.activityLevel as ActivityLevel,
      })
      const targetCals = calculateTargetCalories(tdee, form.goal as Goal)
      const macros     = calculateMacros({ targetCalories: targetCals, weightKg, goal: form.goal as Goal })

      await supabase.from('daily_goals').upsert({
        user_id:      userId,
        calorie_goal: targetCals,
        protein_goal: macros.protein,
        carb_goal:    macros.carbs,
        fat_goal:     macros.fat,
      }, { onConflict: 'user_id' })
    }

    setSaving(false)
    setSuccess(true)
    setEditing(false)
    // Reload to reflect new profile data
    setTimeout(() => window.location.reload(), 600)
  }

  async function signOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const displayName = profile?.name || email.split('@')[0] || 'Elite Athlete'
  const initials    = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <main className="px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto pt-8 space-y-5">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="animate-fadeIn">
        <span className="font-label text-[11px] text-elite-red font-bold tracking-[0.3em] uppercase">Account</span>
        <h1 className="font-heading text-[44px] text-white tracking-wide mt-1 leading-none">Profile</h1>
      </div>

      {/* ── Identity card ──────────────────────────────────── */}
      <GlassCard padding="lg" className="animate-fadeIn [animation-delay:60ms]">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-elite-red flex items-center justify-center shrink-0 shadow-red-sm">
            <span className="font-heading text-white text-[26px]">{initials || 'EE'}</span>
          </div>
          <div className="min-w-0">
            <p className="font-heading text-[28px] text-white tracking-wide leading-tight truncate">{displayName}</p>
            {profile?.username && (
              <p className="font-label text-sm text-elite-red/70">@{profile.username}</p>
            )}
            <p className="text-white/30 text-xs font-body mt-0.5 truncate">{email}</p>
          </div>
        </div>
      </GlassCard>

      {/* ── Stats row ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fadeIn [animation-delay:100ms]">
        {[
          { label: 'Workouts', value: workoutCount.toString() },
          { label: 'Meals',    value: mealCount.toString()    },
          { label: 'Goal',     value: GOAL_LABELS[profile?.fitness_goal ?? ''] ?? '—' },
          { label: 'Activity', value: profile?.activity_level ? ACTIVITY_LABELS[profile.activity_level]?.split(' ')[0] ?? '—' : '—' },
        ].map(s => (
          <GlassCard key={s.label} padding="md" className="text-center">
            <p className="font-heading text-[26px] text-white leading-none">{s.value}</p>
            <p className="font-label text-[11px] text-white/35 uppercase tracking-wide mt-1">{s.label}</p>
          </GlassCard>
        ))}
      </div>

      {/* ── Body stats ─────────────────────────────────────── */}
      <GlassCard padding="lg" className="animate-fadeIn [animation-delay:140ms]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-[22px] text-white tracking-wide">Body & Goals</h2>
          <button onClick={() => { setEditing(e => !e); setError(null); setSuccess(false) }} className="btn-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        </div>

        {!editing ? (
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Age',    value: profile?.age ? `${profile.age} yrs` : '—' },
              { label: 'Gender', value: profile?.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : '—' },
              { label: 'Weight', value: profile?.weight ? `${Math.round(profile.weight)} kg (${weightLbs} lbs)` : '—' },
              { label: 'Height', value: profile?.height ? `${Math.round(profile.height)} cm (${heightFt}′${heightIn}″)` : '—' },
              { label: 'Goal',   value: GOAL_LABELS[profile?.fitness_goal ?? ''] ?? '—' },
              { label: 'Activity Level', value: ACTIVITY_LABELS[profile?.activity_level ?? ''] ?? '—' },
            ].map(s => (
              <div key={s.label}>
                <p className="font-label text-[11px] text-white/35 uppercase tracking-wider mb-0.5">{s.label}</p>
                <p className="font-label font-semibold text-sm text-white">{s.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-label font-semibold text-white/40 mb-1.5 tracking-wider uppercase">Name</label>
                <input className="glass-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your name" />
              </div>
              <div>
                <label className="block text-[11px] font-label font-semibold text-white/40 mb-1.5 tracking-wider uppercase">Age</label>
                <input className="glass-input" type="number" min="13" max="100" value={form.age} onChange={e => set('age', e.target.value)} placeholder="25" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-label font-semibold text-white/40 mb-1.5 tracking-wider uppercase">Biological Sex</label>
              <div className="flex gap-2">
                {(['male','female'] as Gender[]).map(g => (
                  <button key={g} onClick={() => set('gender', g)}
                    className={`flex-1 py-2.5 rounded-xl border font-label text-sm font-semibold capitalize transition-all ${
                      form.gender === g ? 'border-elite-red bg-elite-red/15 text-elite-red' : 'border-white/8 bg-white/4 text-white/40 hover:text-white/60'
                    }`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <label className="block text-[11px] font-label font-semibold text-white/40 mb-1.5 tracking-wider uppercase">Weight</label>
                <input className="glass-input pr-8" type="number" step="0.1" value={form.weight} onChange={e => set('weight', e.target.value)} placeholder="80" />
                <span className="absolute right-3 bottom-3.5 text-white/30 text-xs font-label">kg</span>
              </div>
              <div className="relative">
                <label className="block text-[11px] font-label font-semibold text-white/40 mb-1.5 tracking-wider uppercase">Height</label>
                <input className="glass-input pr-8" type="number" step="0.1" value={form.height} onChange={e => set('height', e.target.value)} placeholder="178" />
                <span className="absolute right-3 bottom-3.5 text-white/30 text-xs font-label">cm</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-label font-semibold text-white/40 mb-1.5 tracking-wider uppercase">Fitness Goal</label>
              <div className="grid grid-cols-2 gap-2">
                {GOALS.map(g => (
                  <button key={g.id} onClick={() => set('goal', g.id)}
                    className={`py-2 rounded-xl border font-label text-sm font-semibold transition-all ${
                      form.goal === g.id ? 'border-elite-red bg-elite-red/15 text-elite-red' : 'border-white/8 bg-white/4 text-white/40 hover:text-white/60'
                    }`}>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-label font-semibold text-white/40 mb-1.5 tracking-wider uppercase">Activity Level</label>
              <div className="space-y-2">
                {ACTIVITY.map(a => (
                  <button key={a.id} onClick={() => set('activityLevel', a.id)}
                    className={`w-full py-2.5 px-4 rounded-xl border font-label text-sm font-semibold text-left transition-all ${
                      form.activityLevel === a.id ? 'border-elite-red bg-elite-red/15 text-elite-red' : 'border-white/8 bg-white/4 text-white/40 hover:text-white/60'
                    }`}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {error   && <div className="alert-error" role="alert">{error}</div>}
            {success && <div className="alert-success" role="status">Profile saved!</div>}

            <div className="flex gap-2 pt-1">
              <GlassButton onClick={saveProfile} loading={saving} style={{ flex: 1 }}>
                Save Changes
              </GlassButton>
              <button onClick={() => setEditing(false)} className="btn-glass" style={{ padding: '13px 20px' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* ── Daily Goals ─────────────────────────────────────── */}
      {goals && (
        <GlassCard padding="lg" className="animate-fadeIn [animation-delay:180ms]">
          <h2 className="font-heading text-[22px] text-white tracking-wide mb-4">Daily Targets</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Calories', value: goals.calorie_goal ? `${Math.round(goals.calorie_goal)} kcal` : '—' },
              { label: 'Protein',  value: goals.protein_goal ? `${Math.round(goals.protein_goal)}g`    : '—' },
              { label: 'Carbs',    value: goals.carb_goal    ? `${Math.round(goals.carb_goal)}g`        : '—' },
              { label: 'Fat',      value: goals.fat_goal     ? `${Math.round(goals.fat_goal)}g`         : '—' },
            ].map(g => (
              <div key={g.label} className="p-3 rounded-xl bg-white/4 border border-white/6">
                <p className="font-label text-[11px] text-white/35 uppercase tracking-wider mb-1">{g.label}</p>
                <p className="font-heading text-[22px] text-white">{g.value}</p>
              </div>
            ))}
          </div>
          <p className="text-white/20 text-xs font-body mt-3">
            Targets are automatically recalculated when you update your profile.
          </p>
        </GlassCard>
      )}

      {/* ── Sign Out ────────────────────────────────────────── */}
      <GlassCard padding="lg" className="animate-fadeIn [animation-delay:220ms]">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-label font-semibold text-sm text-white">Sign Out</p>
            <p className="text-white/30 text-xs font-body mt-0.5">End your current session</p>
          </div>
          <GlassButton
            variant="glass"
            onClick={signOut}
            loading={signingOut}
            style={{ width: 'auto', padding: '11px 20px' }}
          >
            Sign Out
          </GlassButton>
        </div>
      </GlassCard>
    </main>
  )
}
