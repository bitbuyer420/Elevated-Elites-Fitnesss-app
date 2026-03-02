'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type MealItem = {
  id: string; food_name: string
  calories: number; protein: number; carbs: number
  fat: number; fiber: number; sodium: number; sugar: number
}
type Meal = {
  id: string; meal_name: string; time_of_day: string
  meal_items: MealItem[]
}
type Goals = {
  calorie_goal: number; protein_goal: number; carb_goal: number; fat_goal: number
} | null

interface ParsedFood {
  food_name: string; nf_calories: number; nf_protein: number
  nf_total_carbohydrate: number; nf_total_fat: number
  nf_dietary_fiber: number; nf_sodium: number; nf_sugars: number
  serving_qty: number; serving_unit: string
}

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'pre_workout', 'post_workout', 'snack'] as const
const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner',
  snack: 'Snack', pre_workout: 'Pre-Workout', post_workout: 'Post-Workout',
}
const MEAL_ICONS: Record<string, string> = {
  breakfast: '🌅', lunch: '☀️', dinner: '🌙',
  snack: '🍎', pre_workout: '⚡', post_workout: '💪',
}

interface Props {
  userId: string
  initialMeals: Meal[]
  goals: Goals
  initialDate: string
}

export function NutritionClient({ userId, initialMeals, goals, initialDate }: Props) {
  const [meals,        setMeals]        = useState<Meal[]>(initialMeals)
  const [date,         setDate]         = useState(initialDate)
  const [loading,      setLoading]      = useState(false)
  const [aiInput,      setAiInput]      = useState('')
  const [aiLogging,    setAiLogging]    = useState(false)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [aiError,      setAiError]      = useState<string | null>(null)
  const [lastLogged,   setLastLogged]   = useState<string | null>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const supabase  = createClient()

  // ── Aggregates ──────────────────────────────────────────
  const totals = meals.reduce(
    (acc, m) => {
      m.meal_items.forEach(i => {
        acc.calories += i.calories ?? 0
        acc.protein  += i.protein  ?? 0
        acc.carbs    += i.carbs    ?? 0
        acc.fat      += i.fat      ?? 0
      })
      return acc
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  const calorieGoal = goals?.calorie_goal ?? 2000
  const proteinGoal = goals?.protein_goal ?? 150
  const carbGoal    = goals?.carb_goal    ?? 250
  const fatGoal     = goals?.fat_goal     ?? 65
  const remaining   = Math.max(0, calorieGoal - Math.round(totals.calories))
  const calPct      = Math.min(totals.calories / calorieGoal, 1)
  const isOver      = totals.calories > calorieGoal

  // ── Date navigation ─────────────────────────────────────
  const today = new Date().toISOString().split('T')[0]
  const isToday = date === today

  async function changeDate(direction: -1 | 1) {
    const d = new Date(date + 'T12:00:00')
    d.setDate(d.getDate() + direction)
    const newDate = d.toISOString().split('T')[0]
    setDate(newDate)
    setLoading(true)
    const { data } = await supabase
      .from('meals').select('*, meal_items(*)')
      .eq('user_id', userId).eq('date', newDate).order('created_at')
    setMeals(data ?? [])
    setLoading(false)
  }

  function formatDate(iso: string) {
    if (iso === today) return 'Today'
    const yesterday = new Date(Date.now() - 864e5).toISOString().split('T')[0]
    if (iso === yesterday) return 'Yesterday'
    return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  // ── Ensure meal row ──────────────────────────────────────
  async function ensureMeal(time: string): Promise<string> {
    const existing = meals.find(m => m.time_of_day === time)
    if (existing) return existing.id
    const { data, error } = await supabase.from('meals').insert({
      user_id: userId, date, meal_name: MEAL_LABELS[time] ?? time, time_of_day: time,
    }).select('*, meal_items(*)').single()
    if (error || !data) throw new Error(error?.message)
    setMeals(prev => [...prev, data])
    return data.id
  }

  // ── AI natural-language log ──────────────────────────────
  async function logWithAI() {
    if (!aiInput.trim() || aiLogging) return
    setAiLogging(true)
    setAiError(null)
    setLastLogged(null)

    try {
      const res = await fetch('/api/nutrition/log-natural', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiInput }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const { meal_type, foods } = data as { meal_type: string; foods: ParsedFood[] }
      if (!foods?.length) throw new Error('No foods found')

      const mealId = await ensureMeal(meal_type)

      const itemRows = foods.map((f: ParsedFood) => ({
        meal_id:   mealId,
        food_name: f.food_name,
        calories:  f.nf_calories ?? 0,
        protein:   f.nf_protein ?? 0,
        carbs:     f.nf_total_carbohydrate ?? 0,
        fat:       f.nf_total_fat ?? 0,
        fiber:     f.nf_dietary_fiber ?? 0,
        sodium:    f.nf_sodium ?? 0,
        sugar:     f.nf_sugars ?? 0,
      }))

      const { data: inserted } = await supabase.from('meal_items').insert(itemRows).select()
      if (inserted) {
        setMeals(prev => prev.map(m =>
          m.id === mealId ? { ...m, meal_items: [...m.meal_items, ...(inserted as MealItem[])] } : m
        ))
        const totalCals = foods.reduce((s, f) => s + (f.nf_calories ?? 0), 0)
        setLastLogged(`✓ ${foods.length} item${foods.length > 1 ? 's' : ''} added to ${MEAL_LABELS[meal_type] ?? meal_type} · ${Math.round(totalCals)} kcal`)
        setAiInput('')
      }
    } catch (e: unknown) {
      setAiError((e as Error).message ?? 'Could not log food')
    }
    setAiLogging(false)
  }

  // ── Photo logging ────────────────────────────────────────
  const handlePhotoSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPhotoLoading(true)
    setAiError(null)
    setLastLogged(null)

    // Show preview immediately
    const previewUrl = URL.createObjectURL(file)
    setPhotoPreview(previewUrl)

    // Read as base64
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = ev => {
        const result = (ev.target?.result as string) ?? ''
        resolve(result.split(',')[1]) // strip data:image/...;base64, prefix
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    try {
      const res = await fetch('/api/nutrition/log-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mediaType: file.type || 'image/jpeg' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const { meal_type, foods, description } = data as {
        meal_type: string
        description?: string
        foods: ParsedFood[]
      }
      if (!foods?.length) throw new Error('No food detected in image')

      const mealId = await ensureMeal(meal_type)
      const itemRows = foods.map((f: ParsedFood) => ({
        meal_id:   mealId,
        food_name: f.food_name,
        calories:  f.nf_calories ?? 0,
        protein:   f.nf_protein ?? 0,
        carbs:     f.nf_total_carbohydrate ?? 0,
        fat:       f.nf_total_fat ?? 0,
        fiber:     f.nf_dietary_fiber ?? 0,
        sodium:    f.nf_sodium ?? 0,
        sugar:     f.nf_sugars ?? 0,
      }))

      const { data: inserted } = await supabase.from('meal_items').insert(itemRows).select()
      if (inserted) {
        setMeals(prev => prev.map(m =>
          m.id === mealId ? { ...m, meal_items: [...m.meal_items, ...(inserted as MealItem[])] } : m
        ))
        const totalCals = foods.reduce((s, f) => s + (f.nf_calories ?? 0), 0)
        setLastLogged(`📷 ${description ?? `${foods.length} item${foods.length > 1 ? 's' : ''}`} logged to ${MEAL_LABELS[meal_type] ?? meal_type} · ${Math.round(totalCals)} kcal`)
      }
    } catch (e: unknown) {
      setAiError((e as Error).message ?? 'Could not analyze photo')
    }

    setPhotoLoading(false)
    URL.revokeObjectURL(previewUrl)
    setPhotoPreview(null)
    if (cameraRef.current) cameraRef.current.value = ''
  }, [meals, date, supabase, userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Delete item ──────────────────────────────────────────
  async function deleteItem(mealId: string, itemId: string) {
    await supabase.from('meal_items').delete().eq('id', itemId)
    setMeals(prev => prev.map(m =>
      m.id === mealId ? { ...m, meal_items: m.meal_items.filter(i => i.id !== itemId) } : m
    ))
  }

  // ── Sorted meals that have food ──────────────────────────
  const activeMeals = MEAL_ORDER
    .map(t => meals.find(m => m.time_of_day === t))
    .filter((m): m is Meal => !!m && m.meal_items.length > 0)

  const fmt = (n: number) => Math.round(n).toLocaleString()

  // Ring geometry
  const RS = 148, RW = 11
  const rad = (RS - RW) / 2
  const circ = 2 * Math.PI * rad

  return (
    <div className="flex flex-col" style={{ minHeight: '100dvh', paddingBottom: 'calc(var(--nav-bot-h) + 68px)' }}>

      {/* ── Date Nav ──────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-8 pb-5">
        <button onClick={() => changeDate(-1)} className="btn-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div className="text-center">
          <p className="font-label text-[10px] text-elite-red font-bold tracking-[0.3em] uppercase mb-0.5">Nutrition</p>
          <p className="font-heading text-[20px] text-white tracking-wide leading-none">{formatDate(date)}</p>
        </div>
        <button onClick={() => changeDate(1)} disabled={isToday} className="btn-icon" style={{ opacity: isToday ? 0.25 : 1 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      {/* ── Calorie Summary ───────────────────────────── */}
      <div className="flex items-center justify-center gap-10 px-5 pb-5">

        {/* Ring */}
        <div className="relative flex items-center justify-center shrink-0" style={{ width: RS, height: RS }}>
          <svg width={RS} height={RS} style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
            <circle cx={RS/2} cy={RS/2} r={rad} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={RW} />
            <circle cx={RS/2} cy={RS/2} r={rad} fill="none"
              stroke={isOver ? '#FF4444' : '#CC0000'} strokeWidth={RW}
              strokeLinecap="round" strokeDasharray={circ}
              strokeDashoffset={circ * (1 - calPct)}
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1), stroke 0.3s' }}
            />
          </svg>
          <div className="text-center z-10">
            <p className="font-heading leading-none text-white" style={{ fontSize: 32 }}>{fmt(Math.round(totals.calories))}</p>
            <p className="font-label text-[10px] text-white/35 uppercase tracking-widest mt-1">eaten</p>
          </div>
        </div>

        {/* Stats column */}
        <div className="space-y-4">
          <div>
            <p className="font-heading text-[26px] text-white leading-none">
              {isOver ? `+${fmt(Math.round(totals.calories) - calorieGoal)}` : fmt(remaining)}
            </p>
            <p className="font-label text-[10px] uppercase tracking-widest mt-0.5" style={{ color: isOver ? '#FF6666' : 'rgba(255,255,255,0.35)' }}>
              {isOver ? 'over goal' : 'remaining'}
            </p>
          </div>
          <div className="h-px w-12 bg-white/10" />
          <div>
            <p className="font-heading text-[26px] text-white leading-none">{fmt(calorieGoal)}</p>
            <p className="font-label text-[10px] text-white/35 uppercase tracking-widest mt-0.5">goal</p>
          </div>
        </div>
      </div>

      {/* ── Macro Pills ───────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2.5 px-5 pb-5">
        {[
          { label: 'Protein', value: totals.protein, goal: proteinGoal, color: '#CC0000' },
          { label: 'Carbs',   value: totals.carbs,   goal: carbGoal,    color: '#5588CC' },
          { label: 'Fat',     value: totals.fat,     goal: fatGoal,     color: '#CC8822' },
        ].map(m => {
          const pct = Math.min(m.value / m.goal, 1)
          return (
            <div key={m.label} className="glass-card rounded-2xl p-3">
              <p className="font-heading text-[22px] text-white leading-none">{Math.round(m.value)}<span className="text-[13px] text-white/40 font-body font-normal">g</span></p>
              <div className="my-2" style={{ height: 6, borderRadius: 9999, background: 'rgba(255,255,255,0.10)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct * 100}%`, background: m.color, borderRadius: 9999, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
              </div>
              <p className="font-label text-[10px] text-white/35 uppercase tracking-wide">{m.label}</p>
            </div>
          )
        })}
      </div>

      {/* ── Divider ───────────────────────────────────── */}
      <div className="divider-red mx-5 mb-5" />

      {/* ── Food Log ──────────────────────────────────── */}
      <div className="flex-1 px-5 space-y-3">
        {loading && <p className="text-white/25 text-sm font-label text-center py-10">Loading…</p>}

        {!loading && activeMeals.length === 0 && (
          <div className="text-center py-14">
            <p className="font-heading text-[28px] text-white/15 tracking-wide">Nothing logged</p>
            <p className="font-label text-sm text-white/20 mt-2">Tell the AI what you ate below</p>
          </div>
        )}

        {!loading && activeMeals.map(meal => {
          const mealCals = meal.meal_items.reduce((s, i) => s + (i.calories ?? 0), 0)
          return (
            <div key={meal.id} className="glass-card rounded-2xl overflow-hidden">
              {/* Meal header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/6">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 15 }}>{MEAL_ICONS[meal.time_of_day] ?? '🍽'}</span>
                  <span className="font-label font-bold text-[13px] text-white uppercase tracking-wider">
                    {MEAL_LABELS[meal.time_of_day] ?? meal.time_of_day}
                  </span>
                </div>
                <span className="font-label text-[13px] text-white/40">{fmt(mealCals)} kcal</span>
              </div>

              {/* Food items */}
              <div className="divide-y divide-white/5">
                {meal.meal_items.map(item => (
                  <div key={item.id} className="flex items-center px-4 py-3 group">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="font-label font-semibold text-[14px] text-white/90 capitalize truncate">{item.food_name}</p>
                      <p className="font-body text-[11px] text-white/30 mt-0.5">
                        P {Math.round(item.protein)}g · C {Math.round(item.carbs)}g · F {Math.round(item.fat)}g
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="font-label font-bold text-[15px] text-white/75">{fmt(item.calories)}</span>
                      {/* Delete: always visible on mobile, hover on desktop */}
                      <button
                        onClick={() => deleteItem(meal.id, item.id)}
                        className="text-white/20 hover:text-red-400 active:text-red-400 transition-colors md:opacity-0 md:group-hover:opacity-100"
                        aria-label="Remove"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── AI Input Bar — fixed above bottom nav ─────── */}
      <div
        className="fixed left-0 right-0 z-40 px-4 py-3"
        style={{
          bottom: 'var(--nav-bot-h)',
          background: 'rgba(8,8,8,0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {/* Photo preview while analyzing */}
        {photoPreview && (
          <div className="flex items-center gap-3 mb-2 px-1">
            <img src={photoPreview} alt="Analyzing" className="w-10 h-10 rounded-lg object-cover" />
            <p className="font-label text-[12px] text-white/50 animate-pulse">Analyzing photo with Claude…</p>
          </div>
        )}

        {/* Status line */}
        {(aiError || lastLogged) && !photoPreview && (
          <p className={`font-label text-[12px] mb-2 px-1 leading-tight ${aiError ? 'text-red-400' : 'text-green-400'}`}>
            {aiError ?? lastLogged}
          </p>
        )}

        <div className="flex gap-2 items-center">
          {/* Camera button */}
          <button
            onClick={() => cameraRef.current?.click()}
            disabled={aiLogging || photoLoading}
            className="shrink-0 flex items-center justify-center transition-all active:scale-95"
            style={{
              width: 46, height: 46, borderRadius: 14,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
            aria-label="Log food from photo"
          >
            {photoLoading ? (
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            )}
          </button>

          {/* Hidden file input — opens camera on mobile */}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoSelect}
          />

          <input
            ref={inputRef}
            className="flex-1 text-[14px] font-body text-white placeholder:text-white/25 outline-none"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 16,
              padding: '12px 16px',
              transition: 'border-color 0.15s',
            }}
            placeholder="What did you eat? e.g. chicken and rice for lunch"
            value={aiInput}
            onChange={e => { setAiInput(e.target.value); setLastLogged(null); setAiError(null) }}
            onKeyDown={e => e.key === 'Enter' && logWithAI()}
            onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(204,0,0,0.5)' }}
            onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.10)' }}
          />

          {/* Send button */}
          <button
            onClick={logWithAI}
            disabled={aiLogging || !aiInput.trim() || photoLoading}
            className="shrink-0 flex items-center justify-center transition-all active:scale-95"
            style={{
              width: 46, height: 46,
              borderRadius: 14,
              background: aiInput.trim() && !aiLogging ? '#CC0000' : 'rgba(204,0,0,0.2)',
              boxShadow: aiInput.trim() && !aiLogging ? '0 0 16px rgba(204,0,0,0.4)' : 'none',
              transition: 'background 0.2s, box-shadow 0.2s',
            }}
            aria-label="Log food"
          >
            {aiLogging ? (
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
