'use client'

import { useState } from 'react'

export type MuscleView = 'front' | 'back'

// days_since → fill colour
function muscleColor(days?: number): string {
  if (days === undefined || days > 3) return '#1C1C1C'
  if (days === 0) return '#CC0000'
  if (days === 1) return '#881111'
  return '#440000'
}

function muscleOpacity(days?: number): number {
  if (days === undefined || days > 3) return 0.6
  return 1
}

interface Props {
  /** Map of muscle_group → days since last trained (undefined = never) */
  muscleDays: Record<string, number | undefined>
  view: MuscleView
}

interface TooltipState { x: number; y: number; label: string; days?: number }

export function MuscleMap({ muscleDays, view }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const d = muscleDays

  function tip(label: string, muscle: string, e: React.MouseEvent) {
    const rect = (e.currentTarget as SVGElement).closest('svg')!.getBoundingClientRect()
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 36,
      label,
      days: d[muscle],
    })
  }
  const clearTip = () => setTooltip(null)

  const g = (muscle: string, label: string) => ({
    fill: muscleColor(d[muscle]),
    opacity: muscleOpacity(d[muscle]),
    onMouseEnter: (e: React.MouseEvent) => tip(label, muscle, e),
    onMouseLeave: clearTip,
    className: 'muscle-region',
  })

  return (
    <div className="relative select-none">
      <svg
        viewBox="0 0 200 500"
        className="w-full max-w-[200px] mx-auto"
        style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))' }}
      >
        {/* ── Body silhouette (background) ─────────────── */}
        {/* Head */}
        <circle cx="100" cy="36" r="28" fill="#0E0E0E" stroke="#2A2A2A" strokeWidth="1" />
        {/* Neck */}
        <rect x="88" y="62" width="24" height="20" rx="5" fill="#0E0E0E" stroke="#2A2A2A" strokeWidth="1" />
        {/* Torso */}
        <path d="M 52 78 Q 36 80 26 102 L 22 158 L 24 218 Q 50 232 100 234 Q 150 232 176 218 L 178 158 L 174 102 Q 164 80 148 78 Z"
          fill="#0E0E0E" stroke="#2A2A2A" strokeWidth="1" />
        {/* Left arm */}
        <path d="M 22 108 Q 12 130 14 168 Q 16 195 26 222 L 44 222 Q 54 195 54 162 Q 54 126 46 100 Z"
          fill="#0E0E0E" stroke="#2A2A2A" strokeWidth="1" />
        {/* Right arm */}
        <path d="M 178 108 Q 188 130 186 168 Q 184 195 174 222 L 156 222 Q 146 195 146 162 Q 146 126 154 100 Z"
          fill="#0E0E0E" stroke="#2A2A2A" strokeWidth="1" />
        {/* Hands */}
        <ellipse cx="32" cy="230" rx="14" ry="12" fill="#0E0E0E" stroke="#2A2A2A" strokeWidth="1" />
        <ellipse cx="168" cy="230" rx="14" ry="12" fill="#0E0E0E" stroke="#2A2A2A" strokeWidth="1" />
        {/* Left leg */}
        <path d="M 52 238 L 98 238 L 94 350 Q 82 362 70 355 Q 58 348 58 335 L 58 238" fill="#0E0E0E" stroke="#2A2A2A" strokeWidth="1" />
        {/* Right leg */}
        <path d="M 148 238 L 102 238 L 106 335 Q 106 348 130 355 Q 142 362 146 350 Z" fill="#0E0E0E" stroke="#2A2A2A" strokeWidth="1" />
        {/* Lower legs */}
        <path d="M 58 350 Q 54 395 60 435 Q 68 446 80 442 Q 90 438 92 426 Q 96 392 92 350 Z"
          fill="#0E0E0E" stroke="#2A2A2A" strokeWidth="1" />
        <path d="M 142 350 Q 104 392 108 426 Q 110 438 120 442 Q 132 446 140 435 Q 146 395 142 350 Z"
          fill="#0E0E0E" stroke="#2A2A2A" strokeWidth="1" />
        {/* Feet */}
        <ellipse cx="76" cy="448" rx="22" ry="9" fill="#0E0E0E" stroke="#2A2A2A" strokeWidth="1" />
        <ellipse cx="124" cy="448" rx="22" ry="9" fill="#0E0E0E" stroke="#2A2A2A" strokeWidth="1" />

        {/* ── Muscle overlays ───────────────────────────── */}
        {view === 'front' ? (
          <>
            {/* Shoulders */}
            <path d="M 52 80 Q 34 82 24 106 L 26 130 Q 36 140 52 132 L 54 106 Z" {...g('shoulders','Shoulders')} />
            <path d="M 148 80 Q 166 82 176 106 L 174 130 Q 164 140 148 132 L 146 106 Z" {...g('shoulders','Shoulders')} />
            {/* Chest */}
            <path d="M 54 80 L 100 80 L 98 132 Q 74 142 54 130 Z" {...g('chest','Chest')} />
            <path d="M 100 80 L 146 80 L 146 130 Q 126 142 102 132 Z" {...g('chest','Chest')} />
            {/* Biceps */}
            <path d="M 22 110 Q 12 130 14 164 Q 20 176 36 176 Q 48 170 52 152 L 52 112 Z" {...g('biceps','Biceps')} />
            <path d="M 178 110 Q 188 130 186 164 Q 180 176 164 176 Q 152 170 148 152 L 148 112 Z" {...g('biceps','Biceps')} />
            {/* Abs */}
            <path d="M 58 134 Q 100 146 142 134 L 140 216 Q 100 226 60 216 Z" {...g('abs','Abs')} />
            {/* Quads */}
            <path d="M 58 240 L 96 240 L 92 348 Q 78 358 62 348 Z" {...g('quads','Quads')} />
            <path d="M 104 240 L 142 240 L 138 348 Q 122 358 108 348 Z" {...g('quads','Quads')} />
            {/* Calves */}
            <path d="M 62 352 Q 56 390 62 428 Q 70 442 80 438 Q 90 434 92 420 Q 94 388 90 352 Z" {...g('calves','Calves')} />
            <path d="M 138 352 Q 106 388 108 420 Q 110 434 120 438 Q 130 442 138 428 Q 144 390 138 352 Z" {...g('calves','Calves')} />
          </>
        ) : (
          <>
            {/* Triceps (back) */}
            <path d="M 22 110 Q 12 132 14 168 Q 20 180 36 178 Q 48 172 52 154 L 52 112 Z" {...g('triceps','Triceps')} />
            <path d="M 178 110 Q 188 132 186 168 Q 180 180 164 178 Q 152 172 148 154 L 148 112 Z" {...g('triceps','Triceps')} />
            {/* Upper back */}
            <path d="M 54 80 L 146 80 L 144 162 Q 100 172 56 162 Z" {...g('upper_back','Upper Back')} />
            {/* Lower back */}
            <path d="M 56 164 Q 100 174 144 164 L 142 218 Q 100 228 58 218 Z" {...g('lower_back','Lower Back')} />
            {/* Glutes */}
            <path d="M 58 240 L 98 240 L 96 292 Q 78 302 60 290 Z" {...g('glutes','Glutes')} />
            <path d="M 102 240 L 142 240 L 140 290 Q 122 302 104 292 Z" {...g('glutes','Glutes')} />
            {/* Hamstrings */}
            <path d="M 60 294 L 94 294 L 92 348 Q 78 358 62 348 Z" {...g('hamstrings','Hamstrings')} />
            <path d="M 106 294 L 140 294 L 138 348 Q 122 358 108 348 Z" {...g('hamstrings','Hamstrings')} />
            {/* Calves */}
            <path d="M 62 352 Q 56 390 62 428 Q 70 442 80 438 Q 90 434 92 420 Q 94 388 90 352 Z" {...g('calves','Calves')} />
            <path d="M 138 352 Q 106 388 108 420 Q 110 434 120 438 Q 130 442 138 428 Q 144 390 138 352 Z" {...g('calves','Calves')} />
          </>
        )}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-10 glass-card px-3 py-1.5 text-xs font-label font-semibold whitespace-nowrap"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translateX(-50%)' }}
        >
          <span className="text-white">{tooltip.label}</span>
          <span className="text-white/40 ml-2">
            {tooltip.days === undefined ? 'Never trained'
              : tooltip.days === 0 ? 'Trained today'
              : `${tooltip.days}d ago`}
          </span>
        </div>
      )}
    </div>
  )
}
