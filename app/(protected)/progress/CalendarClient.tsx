'use client'

import { useState } from 'react'
import { ConsistencyCalendar } from '@/components/ConsistencyCalendar'
import { GlassCard } from '@/components/GlassCard'

interface DayData { date: string; workout: boolean; meals: boolean }

export function CalendarClient({ data }: { data: DayData[] }) {
  const [modal, setModal] = useState<{ date: string; info: DayData } | null>(null)

  return (
    <>
      <ConsistencyCalendar
        data={data}
        onDayClick={(date, info) => setModal({ date, info })}
      />

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <GlassCard padding="lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-[24px] text-white">
                  {new Date(modal.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h3>
                <button onClick={() => setModal(null)} className="btn-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="space-y-3">
                <div className={`flex items-center gap-3 p-3 rounded-xl ${modal.info.workout ? 'bg-elite-red/10 border border-elite-red/20' : 'bg-white/4 border border-white/6'}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={modal.info.workout ? '#CC0000' : 'rgba(255,255,255,0.3)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 5v14M18 5v14M2 9h4M18 9h4M2 15h4M18 15h4"/>
                  </svg>
                  <span className={`font-label font-semibold text-sm ${modal.info.workout ? 'text-elite-red' : 'text-white/30'}`}>
                    {modal.info.workout ? 'Workout logged' : 'No workout'}
                  </span>
                </div>
                <div className={`flex items-center gap-3 p-3 rounded-xl ${modal.info.meals ? 'bg-white/8 border border-white/12' : 'bg-white/4 border border-white/6'}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={modal.info.meals ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 8h20M8 8V4M12 8V4M16 8V4"/><path d="M4 8c0 8 2 12 8 14C18 20 20 16 20 8"/>
                  </svg>
                  <span className={`font-label font-semibold text-sm ${modal.info.meals ? 'text-white/70' : 'text-white/30'}`}>
                    {modal.info.meals ? 'Meals logged' : 'No meals'}
                  </span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}
    </>
  )
}
