import type { MarketingShowcasePanel } from './marketing-data';

type LandingProductShowcaseProps = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  panels: readonly MarketingShowcasePanel[];
};

export function LandingProductShowcase({ description, eyebrow, id, title, panels }: LandingProductShowcaseProps) {
  const titleId = `${id}-title`;

  return (
    <section id={id} aria-labelledby={titleId} className="rounded-[36px] border border-[var(--border-subtle)] bg-[var(--shell-main-surface)] px-6 py-8 text-[var(--text-primary)] shadow-[var(--shadow-strong)]">
      <div className="flex flex-col gap-4 border-b border-[var(--border-subtle)] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent-mint)]">{eyebrow}</p>
          <h2 id={titleId} className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-[var(--text-primary)] sm:text-4xl">
            {title}
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
          {description}
        </p>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {panels.map((panel) => (
          <article key={panel.title} className="rounded-[30px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-5">
            <div className="inline-flex rounded-full border border-[var(--border-strong)] bg-[var(--surface-highlight)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-mint)]">
              {panel.accent ?? 'Bloque'}
            </div>
            <h3 className="mt-4 text-2xl font-black tracking-tight text-[var(--text-primary)]">{panel.title}</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{panel.description}</p>
            {panel.bullets?.length ? (
              <ul className="mt-5 space-y-2 text-sm leading-7 text-[var(--text-primary)]">
                {panel.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3">
                    <span className="mt-2 h-2 w-2 rounded-full bg-[var(--accent-mint)]" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
