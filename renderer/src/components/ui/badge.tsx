import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center font-medium transition-apple focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-[var(--keyColor)] text-white',
        secondary: 'bg-[var(--systemQuaternary)] text-[var(--systemPrimary)]',
        destructive: 'bg-red-500/10 text-red-500 dark:bg-red-500/20',
        success: 'bg-green-500/10 text-green-500 dark:bg-green-500/20',
        warning: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 dark:bg-yellow-500/20',
        outline: 'border border-[var(--systemQuaternary)] text-[var(--systemSecondary)]',
      },
      size: {
        sm: 'text-caption px-[var(--space-2)] py-[2px]',
        default: 'text-footnote px-[var(--space-3)] py-[var(--space-1)]',
        lg: 'text-callout px-[var(--space-4)] py-[var(--space-2)]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, style, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant, size }), className)}
      style={{
        borderRadius: 'var(--radius-full)',
        ...style,
      }}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
