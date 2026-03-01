'use client'

import { useState } from 'react'
import clsx from 'clsx'

interface DayData {
  date:    string // YYYY-MM-DD
  workout: boolean
  meals:   boolean
}

interface Props {
  data:          DayData[]
  initialYear?:  number
  initialMonth?: number // 0-indexed
  onDayClick?:   (date: string, info: DayData) => void
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December']

export function ConsistencyCalendar({ data, initialYear, initialMonth, onDayClick }: Props) {
  const now   = new Date()
  const [year,  setYear]  = useState(initialYear  ?? now.getFullYear())
  const [month, setMonth] = useState(initialMonth ?? now.getMonth())

  const dataMap = new Map(data.map(d => [d.date, d]))

  const firstDay  = new Date(year, month, 1).getDay()   // 0=Sun
  const daysCount = new Date(year, month + 1, 0).getDate()
  const today     = now.toISOString().split('T')[0]

  function prev() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function next() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  function fmtDate(d: number) {
    const m = String(month + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    return `${year}-${m}-${dd}`
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={prev} className="btn-icon" aria-label="Previous month">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h3 className="font-heading text-[22px] text-white tracking-wide">
          {MONTHS[month]} <span className="text-white/40">{year}</span>
        </h3>
        <button onClick={next} className="btn-icon" aria-label="Next month">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map(w => (
          <div key={w} className="text-center font-label text-[11px] font-semibold text-white/25 uppercase tracking-wider py-1">
            {w}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells before first day */}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}

        {Array.from({ length: daysCount }, (_, i) => {
          const d    = i + 1
          const date = fmtDate(d)
          const info = dataMap.get(date)
          const both    = info?.workout && info?.meals
          const wOnly   = info?.workout && !info?.meals
          const mOnly   = !info?.workout && info?.meals
          const isToday = date === today

          return (
            <button
              key={d}
              onClick={() => info && onDayClick?.(date, info)}
              className={clsx(
                'cal-day relative aspect-square flex flex-col items-center justify-center gap-0.5 p-1',
                both   && 'cal-day-both',
                wOnly  && 'cal-day-workout',
                mOnly  && 'cal-day-meal',
                isToday && 'ring-1 ring-white/20',
              )}
            >
              <span className={clsx(
                'font-label text-[13px] font-bold',
                both || wOnly || mOnly ? 'text-white' : 'text-white/35',
                isToday && 'text-white',
              )}>
                {d}
              </span>
              {/* Status dots */}
              <div className="flex gap-0.5">
                {info?.workout && <span className="w-1 h-1 rounded-full bg-elite-red" />}
                {info?.meals   && <span className="w-1 h-1 rounded-full bg-white/50" />}
              </div>
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-5 justify-center">
        {[
          { label: 'Workout + Meals', cls: 'cal-day-both' },
          { label: 'Workout only',    cls: 'cal-day-workout' },
          { label: 'Meals only',      cls: 'cal-day-meal' },
        ].map(({ label, cls }) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`cal-day w-4 h-4 ${cls}`} />
            <span className="text-white/35 text-xs font-label">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
