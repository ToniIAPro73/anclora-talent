import { User, Library, Building2, Check } from 'lucide-react';
import type { MarketingUseCase } from './marketing-data';

type LandingUseCasesProps = {
  eyebrow: string;
  title: string;
  description: string;
  useCases: readonly MarketingUseCase[];
  id?: string;
};

const ROLE_ICONS = [User, Library, Building2];

export function LandingUseCases({
  description,
  eyebrow,
  title,
  useCases,
  id = 'audiencias',
}: LandingUseCasesProps) {
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
        {useCases.map((uc, idx) => {
          const Icon = ROLE_ICONS[idx % ROLE_ICONS.length] ?? User;
          return (
            <article
              key={uc.title}
              className="flex flex-col justify-between rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-6 transition duration-300 hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent-text)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-text)]">
                    {uc.role}
                  </span>
                </div>

                <h3 className="mt-5 text-xl font-bold tracking-tight text-[var(--text-primary)]">
                  {uc.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {uc.description}
                </p>
              </div>

              <ul className="mt-6 space-y-2.5 border-t border-[var(--border-subtle)] pt-4 text-xs text-[var(--text-primary)]">
                {uc.points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent-text)]">
                      <Check className="h-2 w-2" />
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}
