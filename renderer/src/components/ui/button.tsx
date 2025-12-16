import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-apple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'shadow-apple hover:shadow-apple-md hover:opacity-90 active:scale-[0.98]',
        destructive:
          'bg-red-500 text-white hover:bg-red-600 shadow-apple hover:shadow-apple-md active:scale-[0.98]',
        outline: 'border bg-transparent hover:opacity-80 shadow-apple-sm',
        secondary: 'shadow-apple-sm hover:opacity-80 active:scale-[0.98]',
        ghost: 'hover:opacity-70',
        link: 'underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-6 py-2 rounded-apple',
        sm: 'h-9 px-4 rounded-apple-sm text-sm',
        lg: 'h-12 px-8 rounded-apple-md',
        icon: 'h-10 w-10 rounded-apple',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, style, ...props }, ref) => {
    const defaultStyle =
      variant === 'default' ? { backgroundColor: 'var(--primary)', color: '#fff' } : {}
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        style={{ ...defaultStyle, ...style }}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
