'use client'

interface CalorieRingProps {
  consumed: number
  goal:     number
  size?:    number
  stroke?:  number
}

export function CalorieRing({ consumed, goal, size = 160, stroke = 12 }: CalorieRingProps) {
  const r          = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const pct        = goal > 0 ? Math.min(consumed / goal, 1) : 0
  const offset     = circumference * (1 - pct)
  const over       = consumed > goal

  const cx = size / 2
  const cy = size / 2

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        {/* Fill */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={over ? '#FF4444' : '#CC0000'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-heading text-white leading-none" style={{ fontSize: size * 0.2 }}>
          {consumed.toLocaleString()}
        </span>
        <span className="font-label text-white/35 uppercase tracking-widest" style={{ fontSize: size * 0.075 }}>
          kcal
        </span>
        <div className="mt-1 w-6 h-px bg-white/15" />
        <span className="font-label text-white/25 mt-1" style={{ fontSize: size * 0.075 }}>
          / {goal.toLocaleString()}
        </span>
      </div>
    </div>
  )
}
