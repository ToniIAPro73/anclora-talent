import Image from 'next/image';
import { Check } from 'lucide-react';
import type { MarketingShowcasePanel } from './marketing-data';

type LandingProductShowcaseProps = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  panels: readonly MarketingShowcasePanel[];
};

export function LandingProductShowcase({
  description,
  eyebrow,
  id,
  title,
  panels,
}: LandingProductShowcaseProps) {
  const titleId = `${id}-title`;

  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className="scroll-mt-20 rounded-[36px] border border-[var(--border-subtle)] bg-[var(--shell-main-surface)] px-6 py-8 text-[var(--text-primary)] shadow-[var(--shadow-strong)] sm:px-8 sm:py-12"
    >
      {/* Section Header */}
      <div className="flex flex-col gap-4 border-b border-[var(--border-subtle)] pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--accent-text)]">
            {eyebrow}
          </p>
          <h2
            id={titleId}
            className="mt-3 max-w-3xl text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl lg:text-4xl font-editorial"
          >
            {title}
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">
          {description}
        </p>
      </div>

      {/* Grid of Panels / Bento */}
      <div
        className={`mt-8 grid gap-6 ${
          panels.length === 4
            ? 'sm:grid-cols-2'
            : panels.length === 3
            ? 'lg:grid-cols-3'
            : 'sm:grid-cols-2'
        }`}
      >
        {panels.map((panel, idx) => {
          // Default fallbacks for panel images if not explicitly specified
          const imageSrc =
            panel.image ||
            (idx === 0
              ? '/landing/hero/editor-preview.png'
              : idx === 1
              ? '/landing/features/preview-spread.png'
              : idx === 2
              ? '/landing/hero/cover-preview.png'
              : '/landing/features/exports-suite.png');

          return (
            <article
              key={panel.title}
              className="group flex flex-col justify-between overflow-hidden rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-6 transition-all duration-300 hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)] hover:shadow-lg"
            >
              <div>
                {/* Visual Thumbnail */}
                <div className="relative mb-5 aspect-[16/9] w-full overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--background)] shadow-inner">
                  <Image
                    src={imageSrc}
                    alt={panel.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
                    className="object-cover object-top transition duration-300 group-hover:scale-[1.03]"
                  />
                  {panel.accent ? (
                    <div className="absolute left-3 top-3 rounded-full border border-[var(--border-subtle)] bg-[var(--background)]/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-text)] backdrop-blur-md">
                      {panel.accent}
                    </div>
                  ) : null}
                </div>

                <h3 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                  {panel.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {panel.description}
                </p>
              </div>

              {panel.bullets?.length ? (
                <ul className="mt-5 space-y-2 border-t border-[var(--border-subtle)] pt-4 text-xs text-[var(--text-primary)]">
                  {panel.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-center gap-2">
                      <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent-text)]">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
