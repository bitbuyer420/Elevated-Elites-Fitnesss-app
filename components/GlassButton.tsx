import { type ReactNode, type ButtonHTMLAttributes } from 'react'
import clsx from 'clsx'

type ButtonVariant = 'red' | 'glass' | 'ghost'
type ButtonSize    = 'sm' | 'md' | 'lg'

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  /** Visual style variant */
  variant?: ButtonVariant
  /** Size preset (md maps to CSS class defaults, sm/lg override padding) */
  size?: ButtonSize
  /** Stretch to fill container width */
  fullWidth?: boolean
  /** Shows a spinner and disables the button */
  loading?: boolean
  /** Extra Tailwind classes */
  className?: string
}

// Variant → CSS class defined in globals.css
const variantClass: Record<ButtonVariant, string> = {
  red:   'btn-red',
  glass: 'btn-glass',
  ghost: 'btn-ghost',
}

// Size overrides (md is handled by the CSS class itself)
const sizeClass: Record<ButtonSize, string> = {
  sm: 'py-2 px-4 text-xs',
  md: '',
  lg: 'py-4 px-8 text-base',
}

/**
 * GlassButton — interactive action component.
 *
 * Three variants:
 * - `red`   — Primary CTA with red glow (default)
 * - `glass` — Secondary action with glass surface
 * - `ghost` — Tertiary / nav action, text-only
 *
 * @example
 * <GlassButton variant="red" loading={submitting} fullWidth>
 *   Sign In
 * </GlassButton>
 */
export function GlassButton({
  children,
  variant = 'red',
  size = 'md',
  fullWidth = false,
  loading = false,
  className,
  disabled,
  ...rest
}: GlassButtonProps) {
  return (
    <button
      className={clsx(
        variantClass[variant],
        sizeClass[size],
        fullWidth ? 'w-full' : 'w-auto',
        className
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          {/* Minimal spinner — inherits text colour */}
          <svg
            className="animate-spin h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12" cy="12" r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span>Loading…</span>
        </span>
      ) : (
        children
      )}
    </button>
  )
}
