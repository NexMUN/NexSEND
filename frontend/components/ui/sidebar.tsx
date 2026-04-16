'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface SidebarContextValue {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

const SidebarContext = React.createContext<SidebarContextValue>({
  collapsed: false,
  setCollapsed: () => {},
});

export function useSidebar() {
  return React.useContext(SidebarContext);
}

export function SidebarProvider({
  children,
  defaultCollapsed = false,
}: {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);
  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function Sidebar({ children, className }: { children: React.ReactNode; className?: string }) {
  const { collapsed } = useSidebar();
  return (
    <aside
      className={cn(
        'sidebar-root flex h-screen flex-col border-r border-[var(--border)] bg-[var(--sidebar-bg)] transition-all duration-300 ease-in-out',
        collapsed ? 'w-[64px]' : 'w-[240px]',
        className,
      )}
    >
      {children}
    </aside>
  );
}

export function SidebarHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex items-center px-4 py-5', className)}>{children}</div>;
}

export function SidebarContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex-1 overflow-y-auto overflow-x-hidden px-2 py-2', className)}>{children}</div>;
}

export function SidebarFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('border-t border-[var(--border)] px-3 py-4', className)}>{children}</div>
  );
}

export function SidebarGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mb-2', className)}>{children}</div>;
}

export function SidebarGroupLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  const { collapsed } = useSidebar();
  if (collapsed) return null;
  return (
    <p className={cn('px-3 pb-1 pt-3 text-[0.68rem] font-semibold tracking-[0.1em] text-[var(--muted)] uppercase', className)}>
      {children}
    </p>
  );
}

export function SidebarMenu({ children, className }: { children: React.ReactNode; className?: string }) {
  return <ul className={cn('space-y-0.5', className)}>{children}</ul>;
}

export function SidebarMenuItem({ children }: { children: React.ReactNode }) {
  return <li>{children}</li>;
}

interface SidebarMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
  icon?: React.ReactNode;
  label: string;
  badge?: string | number;
}

export function SidebarMenuButton({ isActive, icon, label, badge, className, ...props }: SidebarMenuButtonProps) {
  const { collapsed } = useSidebar();
  return (
    <button
      type="button"
      title={collapsed ? label : undefined}
      className={cn(
        'sidebar-btn group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
        isActive
          ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-md shadow-[var(--primary)]/25'
          : 'text-[var(--sidebar-fg)] hover:bg-[var(--sidebar-hover)]',
        collapsed && 'justify-center px-2',
        className,
      )}
      {...props}
    >
      {icon && (
        <span className={cn('flex-shrink-0 transition-transform duration-150', isActive && 'drop-shadow-sm')}>
          {icon}
        </span>
      )}
      {!collapsed && (
        <>
          <span className="flex-1 truncate text-left">{label}</span>
          {badge !== undefined && (
            <span
              className={cn(
                'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.65rem] font-bold tabular-nums',
                isActive
                  ? 'bg-[var(--primary-foreground)]/20 text-[var(--primary-foreground)]'
                  : 'bg-[var(--secondary)] text-[var(--secondary-foreground)]',
              )}
            >
              {badge}
            </span>
          )}
        </>
      )}
    </button>
  );
}

export function SidebarSeparator({ className }: { className?: string }) {
  return <hr className={cn('my-2 border-[var(--border)]', className)} />;
}
