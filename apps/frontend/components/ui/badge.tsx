import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center rounded-full px-2.5 py-1 text-[0.7rem] font-semibold tracking-[0.08em] uppercase', {
  variants: {
    variant: {
      default: 'bg-[var(--secondary)] text-[var(--secondary-foreground)]',
      success: 'bg-[color-mix(in_srgb,var(--success)_20%,transparent)] text-[var(--success)]',
      warning: 'bg-[color-mix(in_srgb,var(--warning)_24%,transparent)] text-[var(--warning)]',
      destructive: 'bg-[color-mix(in_srgb,var(--danger)_20%,transparent)] text-[var(--danger)]',
      outline: 'border border-[var(--border)] text-[var(--muted)]',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
