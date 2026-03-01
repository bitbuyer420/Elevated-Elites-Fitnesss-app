'use client'

interface MacroBarProps {
  label:    string
  consumed: number
  goal:     number
  unit?:    string
  color?:   string
}

export function MacroBar({ label, consumed, goal, unit = 'g', color = '#CC0000' }: MacroBarProps) {
  const pct  = goal > 0 ? Math.min((consumed / goal) * 100, 100) : 0
  const over = consumed > goal

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-label text-[12px] font-semibold text-white/50 uppercase tracking-wider">{label}</span>
        <span className="font-label text-[13px] font-bold text-white tabular-nums">
          {consumed.toFixed(0)}<span className="text-white/30 font-normal">/{goal}{unit}</span>
        </span>
      </div>
      <div className="macro-bar-track">
        <div
          className="macro-bar-fill"
          style={{
            width: `${pct}%`,
            background: over ? '#FF4444' : color,
            boxShadow: pct > 10 ? `0 0 6px ${over ? 'rgba(255,68,68,0.5)' : 'rgba(204,0,0,0.4)'}` : 'none',
          }}
        />
      </div>
    </div>
  )
}
