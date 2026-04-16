import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_10px_24px_rgba(23,105,93,0.28)] hover:bg-[var(--primary-hover)] hover:-translate-y-0.5 focus-visible:ring-[var(--ring)]',
        outline:
          'border border-[var(--border)] bg-[var(--background-elevated)] text-[var(--foreground)] hover:bg-[var(--secondary)] focus-visible:ring-[var(--ring)]',
        destructive:
          'bg-[var(--danger)] text-[var(--danger-foreground)] shadow-[0_10px_24px_rgba(145,37,43,0.24)] hover:brightness-95 focus-visible:ring-[var(--danger)]',
        ghost: 'text-[var(--foreground)] hover:bg-[var(--secondary)] focus-visible:ring-[var(--ring)]',
      },
      size: {
        default: 'h-11 px-5',
        sm: 'h-9 rounded-lg px-3',
        lg: 'h-12 px-8 text-[0.95rem]',
        icon: 'h-10 w-10 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
