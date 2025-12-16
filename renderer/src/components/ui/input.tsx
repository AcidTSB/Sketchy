import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, style, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex w-full transition-apple text-body placeholder:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        style={{
          height: '44px',
          paddingInline: 'var(--space-4)',
          paddingBlock: 'var(--space-2)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--systemQuaternary)',
          backgroundColor: 'var(--systemQuaternary)',
          color: 'var(--systemPrimary)',
          boxShadow: 'var(--shadow-sm)',
          ...style,
        }}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
