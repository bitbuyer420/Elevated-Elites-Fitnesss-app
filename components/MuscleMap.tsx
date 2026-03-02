'use client'

import { useState } from 'react'

export type MuscleView = 'front' | 'back'

function muscleColor(days?: number): string {
  if (days === undefined || days > 3) return '#222222'
  if (days === 0) return '#CC0000'
  if (days === 1) return '#881111'
  return '#440000'
}

function muscleOpacity(days?: number): number {
  if (days === undefined || days > 3) return 0.75
  return 1
}

interface Props {
  muscleDays: Record<string, number | undefined>
  view: MuscleView
}

interface TooltipState { x: number; y: number; label: string; days?: number }

export function MuscleMap({ muscleDays, view }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const d = muscleDays

  function tip(label: string, muscle: string, e: React.MouseEvent | React.TouchEvent) {
    const rect = (e.currentTarget as SVGElement).closest('svg')!.getBoundingClientRect()
    let clientX: number, clientY: number
    if ('touches' in e) {
      clientX = e.touches[0]?.clientX ?? (e as React.TouchEvent).changedTouches[0].clientX
      clientY = e.touches[0]?.clientY ?? (e as React.TouchEvent).changedTouches[0].clientY
    } else {
      clientX = (e as React.MouseEvent).clientX
      clientY = (e as React.MouseEvent).clientY
    }
    setTooltip({ x: clientX - rect.left, y: clientY - rect.top - 40, label, days: d[muscle] })
  }
  const clearTip = () => setTooltip(null)

  const g = (muscle: string, label: string) => ({
    fill: muscleColor(d[muscle]),
    opacity: muscleOpacity(d[muscle]),
    onMouseEnter: (e: React.MouseEvent) => tip(label, muscle, e),
    onMouseLeave: clearTip,
    onTouchStart: (e: React.TouchEvent) => { e.preventDefault(); tip(label, muscle, e) },
    onTouchEnd: clearTip,
    className: 'muscle-region',
  })

  // Body fill colors — dark with subtle depth via gradient
  const S = '#2A2A2A' // stroke color
  const sw = '0.8'    // stroke width

  return (
    <div className="relative select-none">
      <svg
        viewBox="0 0 200 500"
        className="w-full max-w-[200px] mx-auto"
        style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.85))' }}
      >
        <defs>
          {/* Horizontal gradient to give subtle 3-D cylindrical depth to the torso */}
          <linearGradient id="torsoDepth" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#0D0D0D" />
            <stop offset="35%"  stopColor="#1C1C1C" />
            <stop offset="50%"  stopColor="#202020" />
            <stop offset="65%"  stopColor="#1C1C1C" />
            <stop offset="100%" stopColor="#0D0D0D" />
          </linearGradient>
          <linearGradient id="limbDepth" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#0E0E0E" />
            <stop offset="50%"  stopColor="#1A1A1A" />
            <stop offset="100%" stopColor="#0E0E0E" />
          </linearGradient>
        </defs>

        {/* ── HEAD ─────────────────────────────────────────────── */}
        {/* Slightly oval, thinner chin */}
        <path
          d="M 100 8 C 122 8 126 20 126 36 C 126 52 120 62 100 64 C 80 62 74 52 74 36 C 74 20 78 8 100 8 Z"
          fill="#171717" stroke={S} strokeWidth={sw}
        />
        {/* Ear nubs */}
        <ellipse cx="74"  cy="36" rx="4" ry="7" fill="#141414" stroke={S} strokeWidth={sw} />
        <ellipse cx="126" cy="36" rx="4" ry="7" fill="#141414" stroke={S} strokeWidth={sw} />

        {/* ── NECK ─────────────────────────────────────────────── */}
        <path
          d="M 93 60 C 91 64 90 70 90 76 L 110 76 C 110 70 109 64 107 60 Z"
          fill="#161616" stroke={S} strokeWidth={sw}
        />

        {/* ── TORSO (athletic V-taper) ──────────────────────────── */}
        {/* Wide at shoulders (~140px), narrow at waist (~64px), slight hip flare */}
        <path
          d="
            M 90 76 C 72 76 54 78 40 84
            C 28 90 24 102 22 118
            L 20 168
            C 20 196 28 216 38 222
            C 58 230 100 232 100 232
            C 100 232 142 230 162 222
            C 172 216 180 196 180 168
            L 178 118
            C 176 102 172 90 160 84
            C 146 78 128 76 110 76
            Z
          "
          fill="url(#torsoDepth)" stroke={S} strokeWidth={sw}
        />

        {/* ── LEFT UPPER ARM ────────────────────────────────────── */}
        {/* Hangs from ~(22,118) to (28,222), about 24px wide */}
        <path
          d="
            M 22 118
            C 14 132 12 158 14 180
            C 16 200 22 218 28 224
            L 44 222
            C 48 214 50 196 50 176
            C 50 154 48 130 40 116
            Z
          "
          fill="url(#limbDepth)" stroke={S} strokeWidth={sw}
        />

        {/* ── RIGHT UPPER ARM ───────────────────────────────────── */}
        <path
          d="
            M 178 118
            C 186 132 188 158 186 180
            C 184 200 178 218 172 224
            L 156 222
            C 152 214 150 196 150 176
            C 150 154 152 130 160 116
            Z
          "
          fill="url(#limbDepth)" stroke={S} strokeWidth={sw}
        />

        {/* ── LEFT FOREARM ─────────────────────────────────────── */}
        <path
          d="
            M 28 224
            C 22 240 20 260 22 278
            C 24 292 30 304 36 310
            L 46 306
            C 50 296 50 278 50 262
            C 50 244 48 228 44 222
            Z
          "
          fill="url(#limbDepth)" stroke={S} strokeWidth={sw}
        />

        {/* ── RIGHT FOREARM ────────────────────────────────────── */}
        <path
          d="
            M 172 224
            C 178 240 180 260 178 278
            C 176 292 170 304 164 310
            L 154 306
            C 150 296 150 278 150 262
            C 150 244 152 228 156 222
            Z
          "
          fill="url(#limbDepth)" stroke={S} strokeWidth={sw}
        />

        {/* ── HANDS ────────────────────────────────────────────── */}
        <ellipse cx="38"  cy="318" rx="10" ry="13" fill="#121212" stroke={S} strokeWidth={sw} />
        <ellipse cx="162" cy="318" rx="10" ry="13" fill="#121212" stroke={S} strokeWidth={sw} />

        {/* ── LEFT UPPER LEG ───────────────────────────────────── */}
        {/* Gap of 6px at crotch: left leg x=54-96, right=104-146 */}
        <path
          d="
            M 54 234
            L 96 234
            C 96 258 94 286 90 314
            C 87 336 82 354 76 364
            C 66 372 56 366 52 352
            C 48 338 50 308 52 280
            Z
          "
          fill="url(#limbDepth)" stroke={S} strokeWidth={sw}
        />

        {/* ── RIGHT UPPER LEG ──────────────────────────────────── */}
        <path
          d="
            M 146 234
            L 104 234
            C 104 258 106 286 110 314
            C 113 336 118 354 124 364
            C 134 372 144 366 148 352
            C 152 338 150 308 148 280
            Z
          "
          fill="url(#limbDepth)" stroke={S} strokeWidth={sw}
        />

        {/* ── LEFT LOWER LEG ───────────────────────────────────── */}
        {/* Diamond-shaped calf */}
        <path
          d="
            M 52 356
            C 46 376 46 404 50 428
            C 53 446 62 456 72 456
            C 82 456 90 446 92 428
            C 94 406 90 376 84 358
            Z
          "
          fill="url(#limbDepth)" stroke={S} strokeWidth={sw}
        />

        {/* ── RIGHT LOWER LEG ──────────────────────────────────── */}
        <path
          d="
            M 148 356
            C 154 376 154 404 150 428
            C 147 446 138 456 128 456
            C 118 456 110 446 108 428
            C 106 406 110 376 116 358
            Z
          "
          fill="url(#limbDepth)" stroke={S} strokeWidth={sw}
        />

        {/* ── FEET ─────────────────────────────────────────────── */}
        <path
          d="M 48 452 C 44 462 46 470 54 474 C 62 478 80 476 92 470 C 98 466 98 460 92 456 Z"
          fill="#111111" stroke={S} strokeWidth={sw}
        />
        <path
          d="M 152 452 C 156 462 154 470 146 474 C 138 478 120 476 108 470 C 102 466 102 460 108 456 Z"
          fill="#111111" stroke={S} strokeWidth={sw}
        />

        {/* ══ MUSCLE OVERLAYS ═══════════════════════════════════ */}
        {view === 'front' ? (
          <>
            {/* Shoulders (anterior deltoids) */}
            <path d="M 40 84 C 26 90 22 104 20 120 L 22 142 C 30 150 46 144 50 136 L 50 116 Z"
              {...g('shoulders', 'Shoulders')} />
            <path d="M 160 84 C 174 90 178 104 180 120 L 178 142 C 170 150 154 144 150 136 L 150 116 Z"
              {...g('shoulders', 'Shoulders')} />

            {/* Chest (pectorals) — left & right halves */}
            <path d="M 50 86 C 72 80 100 78 100 78 L 98 140 C 76 150 50 136 50 136 Z"
              {...g('chest', 'Chest')} />
            <path d="M 150 86 C 128 80 100 78 100 78 L 102 140 C 124 150 150 136 150 136 Z"
              {...g('chest', 'Chest')} />

            {/* Biceps */}
            <path d="M 22 118 C 12 136 12 162 16 182 C 20 192 32 192 44 184 C 50 174 50 152 48 130 L 42 116 Z"
              {...g('biceps', 'Biceps')} />
            <path d="M 178 118 C 188 136 188 162 184 182 C 180 192 168 192 156 184 C 150 174 150 152 152 130 L 158 116 Z"
              {...g('biceps', 'Biceps')} />

            {/* Abs */}
            <path d="M 54 142 C 76 152 100 154 100 154 C 100 154 124 152 146 142 L 144 220 C 124 228 100 230 100 230 C 100 230 76 228 56 220 Z"
              {...g('abs', 'Abs')} />

            {/* Quads */}
            <path d="M 54 236 L 95 236 C 95 260 92 288 88 314 C 85 336 80 352 74 362 C 62 370 54 362 50 348 C 46 334 50 300 52 272 Z"
              {...g('quads', 'Quads')} />
            <path d="M 146 236 L 105 236 C 105 260 108 288 112 314 C 115 336 120 352 126 362 C 138 370 146 362 150 348 C 154 334 150 300 148 272 Z"
              {...g('quads', 'Quads')} />

            {/* Calves */}
            <path d="M 52 360 C 46 382 46 408 50 430 C 54 448 64 456 74 454 C 86 452 92 438 92 420 C 92 400 88 376 82 360 Z"
              {...g('calves', 'Calves')} />
            <path d="M 148 360 C 154 382 154 408 150 430 C 146 448 136 456 126 454 C 114 452 108 438 108 420 C 108 400 112 376 118 360 Z"
              {...g('calves', 'Calves')} />
          </>
        ) : (
          <>
            {/* Trapezius / rear delts */}
            <path d="M 40 84 C 26 90 22 104 20 120 L 22 142 C 30 150 46 144 50 136 L 50 116 Z"
              {...g('upper_back', 'Trapezius')} />
            <path d="M 160 84 C 174 90 178 104 180 120 L 178 142 C 170 150 154 144 150 136 L 150 116 Z"
              {...g('upper_back', 'Trapezius')} />

            {/* Triceps */}
            <path d="M 22 118 C 12 136 12 162 16 182 C 20 192 32 192 44 184 C 50 174 50 152 48 130 L 42 116 Z"
              {...g('triceps', 'Triceps')} />
            <path d="M 178 118 C 188 136 188 162 184 182 C 180 192 168 192 156 184 C 150 174 150 152 152 130 L 158 116 Z"
              {...g('triceps', 'Triceps')} />

            {/* Upper back (lats) — left and right of spine */}
            <path d="M 50 86 C 72 80 100 78 100 78 L 100 86 L 98 170 C 76 178 50 166 50 166 Z"
              {...g('upper_back', 'Upper Back')} />
            <path d="M 150 86 C 128 80 100 78 100 78 L 100 86 L 102 170 C 124 178 150 166 150 166 Z"
              {...g('upper_back', 'Upper Back')} />

            {/* Lower back */}
            <path d="M 50 168 C 76 178 100 176 100 176 C 100 176 124 178 150 168 L 148 222 C 124 230 100 232 100 232 C 100 232 76 230 52 222 Z"
              {...g('lower_back', 'Lower Back')} />

            {/* Glutes */}
            <path d="M 54 236 L 96 236 C 96 260 94 282 86 298 C 78 312 64 316 56 306 C 48 294 50 268 52 250 Z"
              {...g('glutes', 'Glutes')} />
            <path d="M 146 236 L 104 236 C 104 260 106 282 114 298 C 122 312 136 316 144 306 C 152 294 150 268 148 250 Z"
              {...g('glutes', 'Glutes')} />

            {/* Hamstrings */}
            <path d="M 56 308 L 92 308 C 91 332 88 354 82 364 C 74 374 60 370 54 358 C 48 344 50 322 52 312 Z"
              {...g('hamstrings', 'Hamstrings')} />
            <path d="M 144 308 L 108 308 C 109 332 112 354 118 364 C 126 374 140 370 146 358 C 152 344 150 322 148 312 Z"
              {...g('hamstrings', 'Hamstrings')} />

            {/* Calves */}
            <path d="M 52 360 C 46 382 46 408 50 430 C 54 448 64 456 74 454 C 86 452 92 438 92 420 C 92 400 88 376 82 360 Z"
              {...g('calves', 'Calves')} />
            <path d="M 148 360 C 154 382 154 408 150 430 C 146 448 136 456 126 454 C 114 452 108 438 108 420 C 108 400 112 376 118 360 Z"
              {...g('calves', 'Calves')} />
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
