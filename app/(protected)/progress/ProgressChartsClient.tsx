'use client'

import { useState, useTransition } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { GlassCard } from '@/components/GlassCard'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId:      string
  weightLogs:  { date: string; weight: number }[]
  todayWeight: number | null
  calorieData: { date: string; calories: number }[]
  volumeData:  { week: string; sets: number }[]
  calorieGoal: number | null
}

// Recharts renders tooltips outside the React tree via a portal, so we must
// use inline styles — Tailwind classes won't reach those elements.
function ChartTooltip({ active, payload, label, unit }: {
  active?: boolean
  payload?: { value: number; name?: string }[]
  label?: string
  unit?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(18,18,18,0.92)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10,
      padding: '8px 14px',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
    }}>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: '0 0 4px', fontFamily: 'var(--font-barlow-condensed)', letterSpacing: '0.05em' }}>
        {label}
      </p>
      <p style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0, fontFamily: 'var(--font-barlow-condensed)' }}>
        {payload[0].value}{unit ?? ''}
      </p>
    </div>
  )
}

// Shared axis/grid style constants
const GRID_STROKE  = 'rgba(255,255,255,0.06)'
const TICK_STYLE   = { fill: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'var(--font-barlow-condensed)' }
const PRIMARY      = '#CC0000'
const MARGIN       = { top: 10, right: 8, left: -8, bottom: 0 }

// Format a full ISO date string to "Jan 5" for axis labels
function shortDate(iso: string): string {
  const [, month, day] = iso.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[parseInt(month, 10) - 1]} ${parseInt(day, 10)}`
}

export function ProgressChartsClient({
  userId,
  weightLogs,
  todayWeight,
  calorieData,
  volumeData,
  calorieGoal,
}: Props) {
  const supabase = createClient()

  const [weightInput, setWeightInput] = useState<string>(
    todayWeight != null ? String(todayWeight) : ''
  )
  const [savedWeight, setSavedWeight] = useState<number | null>(todayWeight)
  const [saveError, setSaveError]     = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()
  const [weightRange, setWeightRange] = useState<30 | 60 | 90>(30)

  // Filter weight data by selected range
  const today = new Date().toISOString().split('T')[0]
  const rangeStart = new Date(Date.now() - weightRange * 864e5).toISOString().split('T')[0]
  const filteredWeightLogs = weightLogs.filter(e => e.date >= rangeStart)

  async function handleSaveWeight() {
    setSaveError(null)
    const parsed = parseFloat(weightInput)
    if (isNaN(parsed) || parsed <= 0 || parsed >= 700) {
      setSaveError('Enter a valid weight between 0 and 700 kg.')
      return
    }

    startTransition(async () => {
      const { error } = await supabase.from('body_weight_logs').upsert(
        { user_id: userId, date: today, weight_kg: parsed },
        { onConflict: 'user_id,date' }
      )
      if (error) {
        setSaveError(error.message)
      } else {
        setSavedWeight(parsed)
      }
    })
  }

  return (
    <div className="space-y-6">

      {/* ── Weight Trend ─────────────────────────────────────────── */}
      <GlassCard padding="lg" className="animate-fadeIn [animation-delay:60ms]">
        <div className="mb-5">
          <span className="font-label text-[11px] text-elite-red font-bold tracking-[0.3em] uppercase">Body Weight</span>
          <h2 className="font-heading text-[28px] text-white tracking-wide mt-1">Weight Trend</h2>
        </div>

        {/* Log today's weight */}
        <div className="flex flex-wrap items-start gap-3 mb-6">
          <div className="flex-1 min-w-[160px]">
            <label className="font-label text-[11px] text-white/40 tracking-widest uppercase block mb-1.5">
              Today&apos;s weight (kg)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="699"
              value={weightInput}
              onChange={e => setWeightInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveWeight()}
              placeholder="e.g. 82.5"
              className="w-full bg-white border border-white/20 rounded-xl px-4 py-2.5 text-gray-900 font-label text-sm placeholder:text-gray-400 focus:outline-none focus:border-elite-red focus:ring-2 focus:ring-elite-red/30 transition"
            />
          </div>
          <div className="flex flex-col justify-end">
            <div className="h-[1.625rem]" /> {/* label spacer */}
            <button
              onClick={handleSaveWeight}
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl bg-elite-red text-white font-label font-bold text-sm tracking-wide hover:bg-elite-red/80 active:scale-95 transition disabled:opacity-50"
            >
              {isPending ? 'Saving…' : 'Save'}
            </button>
          </div>

          {savedWeight != null && !saveError && (
            <div className="w-full flex items-center gap-2 text-white/50 font-label text-xs mt-1">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Saved — {savedWeight} kg logged for today
            </div>
          )}
          {saveError && (
            <p className="w-full font-label text-xs text-red-400 mt-1">{saveError}</p>
          )}
        </div>

        {/* Range toggle */}
        <div className="flex gap-2 mb-4">
          {([30, 60, 90] as const).map(days => (
            <button
              key={days}
              onClick={() => setWeightRange(days)}
              className={`px-3 py-1 rounded-lg font-label text-xs font-bold tracking-wide transition ${
                weightRange === days
                  ? 'bg-elite-red text-white'
                  : 'bg-white/6 text-white/40 hover:text-white/70'
              }`}
            >
              {days}d
            </button>
          ))}
        </div>

        {filteredWeightLogs.length < 2 ? (
          <p className="font-label text-sm text-white/30 text-center py-8">
            Log at least 2 days of weight to see your trend.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={filteredWeightLogs} margin={MARGIN}>
              <CartesianGrid stroke={GRID_STROKE} vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                tick={TICK_STYLE}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={TICK_STYLE}
                axisLine={false}
                tickLine={false}
                domain={[
                  (min: number) => Math.floor(min - 1),
                  (max: number) => Math.ceil(max + 1),
                ]}
                tickCount={5}
              />
              <Tooltip
                content={<ChartTooltip unit=" kg" />}
                cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke={PRIMARY}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: PRIMARY, stroke: 'rgba(0,0,0,0.5)', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </GlassCard>

      {/* ── Daily Calories ───────────────────────────────────────── */}
      <GlassCard padding="lg" className="animate-fadeIn [animation-delay:120ms]">
        <div className="mb-5">
          <span className="font-label text-[11px] text-elite-red font-bold tracking-[0.3em] uppercase">Nutrition</span>
          <h2 className="font-heading text-[28px] text-white tracking-wide mt-1">Daily Calories</h2>
          <p className="font-label text-xs text-white/35 mt-1">Last 30 days</p>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={calorieData} margin={MARGIN}>
            <CartesianGrid stroke={GRID_STROKE} vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={TICK_STYLE}
              axisLine={false}
              tickLine={false}
              interval={6}
            />
            <YAxis
              tick={TICK_STYLE}
              axisLine={false}
              tickLine={false}
              tickCount={5}
            />
            <Tooltip
              content={<ChartTooltip unit=" kcal" />}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            />
            {calorieGoal != null && (
              <ReferenceLine
                y={calorieGoal}
                stroke="rgba(255,255,255,0.25)"
                strokeDasharray="4 4"
                label={{
                  value: `Goal: ${calorieGoal} kcal`,
                  position: 'insideTopRight',
                  fill: 'rgba(255,255,255,0.3)',
                  fontSize: 10,
                  fontFamily: 'var(--font-barlow-condensed)',
                }}
              />
            )}
            <Bar
              dataKey="calories"
              fill={PRIMARY}
              fillOpacity={0.75}
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>

      {/* ── Weekly Volume ────────────────────────────────────────── */}
      <GlassCard padding="lg" className="animate-fadeIn [animation-delay:180ms]">
        <div className="mb-5">
          <span className="font-label text-[11px] text-elite-red font-bold tracking-[0.3em] uppercase">Volume</span>
          <h2 className="font-heading text-[28px] text-white tracking-wide mt-1">Weekly Sets</h2>
          <p className="font-label text-xs text-white/35 mt-1">Last 8 weeks</p>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={volumeData} margin={MARGIN}>
            <CartesianGrid stroke={GRID_STROKE} vertical={false} />
            <XAxis
              dataKey="week"
              tick={TICK_STYLE}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={TICK_STYLE}
              axisLine={false}
              tickLine={false}
              tickCount={5}
            />
            <Tooltip
              content={<ChartTooltip unit=" sets" />}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            />
            <Bar
              dataKey="sets"
              fill={PRIMARY}
              fillOpacity={0.75}
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>

    </div>
  )
}
