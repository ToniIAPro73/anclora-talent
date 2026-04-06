'use client';

import type { CoverDesign } from '@/lib/projects/types';

type Layout = NonNullable<CoverDesign['layout']>;

const LAYOUTS: { value: Layout; label: string; icon: React.ReactNode }[] = [
  {
    value: 'centered',
    label: 'Centrado',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <line x1="7" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="9" y1="14" x2="15" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: 'top',
    label: 'Arriba',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <line x1="6" y1="7" x2="18" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="6" y1="11" x2="14" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: 'bottom',
    label: 'Abajo',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <line x1="6" y1="14" x2="18" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="6" y1="18" x2="14" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: 'overlay-centered',
    label: 'Superpuesto Central',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="5" y="5" width="14" height="14" rx="1" fill="currentColor" opacity="0.3" />
        <line x1="7" y1="12" x2="17" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="9" y1="15" x2="15" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: 'overlay-bottom',
    label: 'Superpuesto Abajo',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="5" y="5" width="14" height="14" rx="1" fill="currentColor" opacity="0.3" />
        <line x1="6" y1="16" x2="18" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="6" y1="19" x2="14" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: 'image-only',
    label: 'Solo Imagen',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="5" y="5" width="14" height="14" rx="1" fill="currentColor" opacity="0.4" />
        <line x1="6" y1="18" x2="18" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: 'minimalist',
    label: 'Minimalista',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="5" y="5" width="14" height="14" rx="1" fill="currentColor" opacity="0.2" />
        <line x1="6" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="6" y1="11" x2="10" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function CoverToolbar({
  layout,
  onLayoutChange,
}: {
  layout: Layout;
  onLayoutChange: (layout: Layout) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {LAYOUTS.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onLayoutChange(item.value)}
          title={item.label}
          className={`flex items-center gap-2 rounded-[14px] border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-mint)] ${
            layout === item.value
              ? 'border-[var(--button-highlight-bg)] bg-[var(--button-highlight-bg)] text-[var(--button-highlight-fg)]'
              : 'border-[var(--border-subtle)] bg-[var(--surface-soft)] text-[var(--text-secondary)] hover:border-[var(--accent-mint)] hover:text-[var(--text-primary)]'
          }`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}
