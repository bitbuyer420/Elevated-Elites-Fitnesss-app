'use client'

import { useState } from 'react'
import { MuscleMap, type MuscleView } from '@/components/MuscleMap'

interface Props { muscleDays: Record<string, number | undefined> }

export function MuscleMapClient({ muscleDays }: Props) {
  const [view, setView] = useState<MuscleView>('front')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="font-label text-[11px] text-elite-red font-bold tracking-[0.3em] uppercase">Muscle Recovery</span>
          <h2 className="font-heading text-[28px] text-white tracking-wide mt-1">Body Map</h2>
        </div>
        <div className="flex rounded-xl overflow-hidden border border-white/10">
          {(['front','back'] as MuscleView[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-2 font-label text-xs font-semibold uppercase tracking-wide transition-colors ${view === v ? 'bg-elite-red text-white' : 'text-white/40 hover:text-white'}`}>
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="max-w-[240px] mx-auto">
        <MuscleMap muscleDays={muscleDays} view={view} />
      </div>
    </div>
  )
}
