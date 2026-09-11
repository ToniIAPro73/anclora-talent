import { BookOpen, Layers } from 'lucide-react';
import type { MarketingShowcaseItem } from './marketing-data';

type LandingShowcaseProps = {
  eyebrow: string;
  title: string;
  description: string;
  items: readonly MarketingShowcaseItem[];
  id?: string;
};

// Distinctive subtle cover palettes for realistic book mockups
const COVER_STYLES = [
  'from-amber-900/40 via-stone-900/80 to-zinc-950 border-amber-500/30 text-amber-200',
  'from-teal-950/60 via-slate-900/80 to-zinc-950 border-teal-500/30 text-teal-200',
  'from-indigo-950/60 via-stone-900/80 to-zinc-950 border-indigo-500/30 text-indigo-200',
];

export function LandingShowcase({
  description,
  eyebrow,
  items,
  title,
  id = 'vitrina',
}: LandingShowcaseProps) {
  return (
    <section
      id={id}
      className="scroll-mt-20 rounded-[34px] border border-[var(--border-subtle)] bg-[var(--page-surface)] px-6 py-8 shadow-[var(--shadow-soft)] sm:px-8 sm:py-10"
    >
      <div className="flex flex-col gap-4 border-b border-[var(--border-subtle)] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--accent-text)]">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl font-editorial">
            {title}
          </h2>
        </div>
        <p className="max-w-lg text-sm leading-relaxed text-[var(--text-secondary)]">
          {description}
        </p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {items.map((item, idx) => {
          const coverStyle = COVER_STYLES[idx % COVER_STYLES.length];
          return (
            <article
              key={item.title}
              className="group flex flex-col justify-between rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-6 transition duration-300 hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)] hover:shadow-xl"
            >
              <div>
                {/* Simulated 3D Book Cover Card */}
                <div
                  className={`relative mb-6 flex h-48 w-full flex-col justify-between overflow-hidden rounded-xl border bg-gradient-to-br p-5 shadow-lg transition duration-300 group-hover:-translate-y-1 ${coverStyle}`}
                >
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-widest font-mono opacity-80">
                    <span>{item.category}</span>
                    <BookOpen className="h-3.5 w-3.5 opacity-60" />
                  </div>

                  <div className="my-auto text-center">
                    <h4 className="font-editorial text-xl font-bold tracking-wide leading-tight text-white drop-shadow-sm">
                      {item.title}
                    </h4>
                    <p className="mt-1 text-xs tracking-wider opacity-80">{item.author}</p>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[10px] opacity-70">
                    <span>Edición Talent</span>
                    <Layers className="h-3 w-3" />
                  </div>
                </div>

                {/* Info */}
                <div className="inline-flex rounded-full border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-text)]">
                  {item.category}
                </div>
                <h3 className="mt-3 text-lg font-bold tracking-tight text-[var(--text-primary)]">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">Por {item.author}</p>
                <p className="mt-3 text-xs leading-relaxed text-[var(--text-secondary)]">
                  {item.tagline}
                </p>
              </div>

              <div className="mt-6 border-t border-[var(--border-subtle)] pt-3 text-[11px] font-mono text-[var(--text-tertiary)]">
                {item.specs}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
