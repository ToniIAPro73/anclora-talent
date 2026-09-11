import { CheckCircle2, FileCode, BookOpen, Palette, Lock } from 'lucide-react';

type LandingProofStripProps = {
  eyebrow: string;
  items: readonly string[];
};

const ICONS = [FileCode, BookOpen, Palette, Lock];

export function LandingProofStrip({ eyebrow, items }: LandingProofStripProps) {
  return (
    <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface)] px-5 py-6 shadow-[var(--shadow-soft)] sm:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-text)]">
          {eyebrow}
        </p>
        <span className="text-xs text-[var(--text-tertiary)]">
          Estándares editoriales abiertos sin ataduras propietarias
        </span>
      </div>
      <ul
        className="mt-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4"
        role="list"
      >
        {items.map((item, idx) => {
          const Icon = ICONS[idx % ICONS.length] ?? CheckCircle2;
          return (
            <li
              key={item}
              className="flex items-start gap-3 rounded-[20px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-4 transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent-text)]">
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-xs font-medium leading-snug text-[var(--text-primary)]">
                {item}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
