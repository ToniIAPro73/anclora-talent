import type { ReactNode } from 'react';

export function Panel({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[28px] border border-panel-border bg-panel px-6 py-6 shadow-[0_24px_80px_rgba(44,51,45,0.08)] ${className}`}
    >
      {children}
    </section>
  );
}
