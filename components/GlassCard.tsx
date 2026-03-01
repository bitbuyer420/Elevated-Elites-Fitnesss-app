import { type ReactNode, type ElementType, type HTMLAttributes } from 'react'
import clsx from 'clsx'

type PaddingSize = 'none' | 'sm' | 'md' | 'lg' | 'xl'

interface GlassCardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  /** Extra Tailwind classes */
  className?: string
  /** Subtle red glow on the card shadow */
  glow?: boolean
  /** Inner padding preset */
  padding?: PaddingSize
  /** Render as a different HTML element (default: div) */
  as?: ElementType
}

const paddingMap: Record<PaddingSize, string> = {
  none: '',
  sm:   'p-4',
  md:   'p-6',
  lg:   'p-8',
  xl:   'p-10 sm:p-12',
}

/**
 * GlassCard — the foundational surface component.
 *
 * Applies the liquid-glass aesthetic: backdrop-blur, transparent background,
 * subtle border, and layered box-shadow. Every content panel in the app
 * should be wrapped in a GlassCard.
 *
 * @example
 * <GlassCard glow padding="lg">
 *   <h2>Today's Workout</h2>
 * </GlassCard>
 */
export function GlassCard({
  children,
  className,
  glow = false,
  padding = 'lg',
  as: Tag = 'div',
  ...rest
}: GlassCardProps) {
  return (
    <Tag
      className={clsx(
        'glass-card',
        paddingMap[padding],
        glow && 'glass-card-glow',
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}
