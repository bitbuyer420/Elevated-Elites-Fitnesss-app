'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard }   from '@/components/GlassCard'
import { GlassButton } from '@/components/GlassButton'
import { CalorieRing } from '@/components/CalorieRing'
import { MacroBar }    from '@/components/MacroBar'

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

const TIME_SECTIONS = ['breakfast','lunch','dinner','snack','pre_workout','post_workout'] as const

interface Props {
  userId:       string
  initialMeals: Meal[]
  goals:        Goals
  initialDate:  string
}

interface NixFood {
  food_name: string; nf_calories: number; nf_protein: number
  nf_total_carbohydrate: number; nf_total_fat: number
  nf_dietary_fiber: number; nf_sodium: number; nf_sugars: number
  serving_qty: number; serving_unit: string
}

export function NutritionClient({ userId, initialMeals, goals, initialDate }: Props) {
  const [meals,   setMeals]   = useState<Meal[]>(initialMeals)
  const [date,    setDate]    = useState(initialDate)
  const [loading, setLoading] = useState(false)
  const [addingTo, setAddingTo] = useState<string | null>(null) // meal ID
  const [searchQ, setSearchQ]   = useState('')
  const [results, setResults]   = useState<NixFood[]>([])
  const [searching, setSearching] = useState(false)
  const [searchErr, setSearchErr] = useState<string | null>(null)
  const supabase = createClient()

  // ── Aggregate totals ──────────────────────────────────
  const totals = meals.reduce(
    (acc, m) => {
      m.meal_items.forEach(i => {
        acc.calories += i.calories ?? 0; acc.protein += i.protein ?? 0
        acc.carbs    += i.carbs    ?? 0; acc.fat     += i.fat     ?? 0
        acc.fiber    += i.fiber    ?? 0; acc.sodium  += i.sodium  ?? 0
        acc.sugar    += i.sugar    ?? 0
      })
      return acc
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0, sugar: 0 }
  )

  // ── Date change ───────────────────────────────────────
  async function changeDate(d: string) {
    setDate(d); setLoading(true)
    const { data } = await supabase.from('meals').select('*, meal_items(*)').eq('user_id', userId).eq('date', d).order('created_at')
    setMeals(data ?? [])
    setLoading(false)
  }

  // ── Create a meal section if it doesn't exist ─────────
  async function ensureMeal(time: string): Promise<string> {
    const existing = meals.find(m => m.time_of_day === time)
    if (existing) return existing.id
    const { data, error } = await supabase.from('meals').insert({
      user_id: userId, date, meal_name: time.replace('_', ' '), time_of_day: time,
    }).select('*, meal_items(*)').single()
    if (error || !data) throw new Error(error?.message)
    setMeals(prev => [...prev, data])
    return data.id
  }

  // ── Search Nutritionix ────────────────────────────────
  async function search() {
    if (!searchQ.trim()) return
    setSearching(true); setSearchErr(null); setResults([])
    try {
      const res = await fetch('/api/nutrition/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQ }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResults(data.foods ?? [])
    } catch (e: unknown) {
      setSearchErr((e as Error).message ?? 'Search failed')
    }
    setSearching(false)
  }

  // ── Add food item ─────────────────────────────────────
  async function addFood(food: NixFood, time: string) {
    const mealId = await ensureMeal(time)
    const { data: item } = await supabase.from('meal_items').insert({
      meal_id:  mealId,
      food_name: food.food_name,
      calories: food.nf_calories ?? 0,
      protein:  food.nf_protein ?? 0,
      carbs:    food.nf_total_carbohydrate ?? 0,
      fat:      food.nf_total_fat ?? 0,
      fiber:    food.nf_dietary_fiber ?? 0,
      sodium:   food.nf_sodium ?? 0,
      sugar:    food.nf_sugars ?? 0,
    }).select().single()

    if (item) {
      setMeals(prev => prev.map(m =>
        m.id === mealId ? { ...m, meal_items: [...m.meal_items, item as MealItem] } : m
      ))
    }
    setResults([]); setSearchQ(''); setAddingTo(null)
  }

  // ── Delete item ───────────────────────────────────────
  async function deleteItem(mealId: string, itemId: string) {
    await supabase.from('meal_items').delete().eq('id', itemId)
    setMeals(prev => prev.map(m =>
      m.id === mealId ? { ...m, meal_items: m.meal_items.filter(i => i.id !== itemId) } : m
    ))
  }

  const fmt = (n: number) => Math.round(n).toLocaleString()

  return (
    <main className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto pt-8 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between animate-fadeIn">
        <div>
          <span className="font-label text-[11px] text-elite-red font-bold tracking-[0.3em] uppercase">Nutrition</span>
          <h1 className="font-heading text-[44px] text-white tracking-wide mt-1 leading-none">Food Tracker</h1>
        </div>
        <input type="date" value={date} onChange={e => changeDate(e.target.value)}
          className="glass-input w-auto text-sm" style={{ maxWidth: 160 }} />
      </div>

      {/* Calorie ring + macros */}
      <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 animate-fadeIn [animation-delay:60ms]">
        <GlassCard padding="lg" className="flex flex-col items-center gap-3 glass-card-glow">
          <CalorieRing consumed={Math.round(totals.calories)} goal={goals?.calorie_goal ?? 2000} size={160} />
        </GlassCard>
        <GlassCard padding="lg" className="flex flex-col justify-center gap-4">
          <MacroBar label="Protein" consumed={Math.round(totals.protein)} goal={goals?.protein_goal ?? 150} color="#CC0000" />
          <MacroBar label="Carbs"   consumed={Math.round(totals.carbs)}   goal={goals?.carb_goal    ?? 250} color="#5588CC" />
          <MacroBar label="Fat"     consumed={Math.round(totals.fat)}     goal={goals?.fat_goal     ?? 65}  color="#CC8822" />
          {/* Micros */}
          <div className="pt-3 border-t border-white/8 grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Fiber', value: `${fmt(totals.fiber)}g` },
              { label: 'Sodium', value: `${fmt(totals.sodium)}mg` },
              { label: 'Sugar', value: `${fmt(totals.sugar)}g` },
            ].map(m => (
              <div key={m.label}>
                <p className="font-heading text-[20px] text-white">{m.value}</p>
                <p className="font-label text-[10px] text-white/35 uppercase tracking-wide">{m.label}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {loading && <p className="text-white/40 font-label text-sm text-center py-4">Loading…</p>}

      {/* Meal sections */}
      {!loading && TIME_SECTIONS.map(time => {
        const meal = meals.find(m => m.time_of_day === time)
        const items = meal?.meal_items ?? []
        const sectionCals = items.reduce((s, i) => s + (i.calories ?? 0), 0)

        return (
          <GlassCard key={time} padding="lg" className="animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading text-[22px] text-white tracking-wide capitalize">
                  {time.replace('_', ' ')}
                </h3>
                {sectionCals > 0 && (
                  <span className="font-label text-xs text-white/35">{fmt(sectionCals)} kcal</span>
                )}
              </div>
              <button
                onClick={() => { setAddingTo(addingTo === (meal?.id ?? time) ? null : (meal?.id ?? time)); setResults([]); setSearchQ('') }}
                className="btn-icon"
                aria-label="Add food"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
            </div>

            {/* Food items */}
            {items.length > 0 && (
              <div className="space-y-2 mb-4">
                {items.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-white/4 border border-white/6 group">
                    <div className="flex-1 min-w-0">
                      <p className="font-label font-semibold text-sm text-white capitalize truncate">{item.food_name}</p>
                      <p className="text-white/35 text-xs font-body mt-0.5">
                        {fmt(item.calories)} kcal · P {fmt(item.protein)}g · C {fmt(item.carbs)}g · F {fmt(item.fat)}g
                      </p>
                    </div>
                    <button
                      onClick={() => meal && deleteItem(meal.id, item.id)}
                      className="ml-2 opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all"
                      aria-label="Delete food"
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

            {/* Add food panel */}
            {(addingTo === (meal?.id ?? time)) && (
              <div className="border-t border-white/8 pt-4 space-y-3">
                <div className="flex gap-2">
                  <input
                    className="glass-input flex-1"
                    placeholder="e.g. 2 scrambled eggs, 100g oats..."
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && search()}
                  />
                  <GlassButton variant="glass" onClick={search} loading={searching} style={{ width: 'auto', padding: '13px 16px' }}>
                    Search
                  </GlassButton>
                </div>
                {searchErr && <p className="text-red-400 text-xs font-body">{searchErr}</p>}
                {results.length > 0 && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {results.map((food, i) => (
                      <button key={i} onClick={() => addFood(food, time)}
                        className="w-full text-left p-3 rounded-xl bg-white/4 border border-white/6 hover:border-elite-red/30 hover:bg-elite-red/6 transition-all">
                        <p className="font-label font-semibold text-sm text-white capitalize">{food.food_name}</p>
                        <p className="text-white/35 text-xs font-body">
                          {Math.round(food.nf_calories)} kcal · {food.serving_qty} {food.serving_unit} ·
                          P {Math.round(food.nf_protein)}g · C {Math.round(food.nf_total_carbohydrate)}g · F {Math.round(food.nf_total_fat)}g
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {items.length === 0 && addingTo !== (meal?.id ?? time) && (
              <p className="text-white/20 text-sm font-body text-center py-2">No food logged</p>
            )}
          </GlassCard>
        )
      })}
    </main>
  )
}
