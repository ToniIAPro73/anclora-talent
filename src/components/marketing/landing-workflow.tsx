import { ArrowRight, FileText, Sliders, BookCheck } from 'lucide-react';
import type { MarketingWorkflowStep } from './marketing-data';

type LandingWorkflowProps = {
  eyebrow: string;
  title: string;
  description: string;
  advanceLabel?: string;
  stepLabel: string;
  steps: readonly MarketingWorkflowStep[];
  id?: string;
};

const STEP_ICONS = [FileText, Sliders, BookCheck];

export function LandingWorkflow({
  advanceLabel,
  description,
  eyebrow,
  stepLabel,
  steps,
  title,
  id = 'caracteristicas',
}: LandingWorkflowProps) {
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
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl lg:text-4xl font-editorial">
            {title}
          </h2>
        </div>
        <p className="max-w-lg text-sm leading-relaxed text-[var(--text-secondary)]">
          {description}
        </p>
      </div>

      <ol className="mt-8 grid gap-5 lg:grid-cols-3" role="list">
        {steps.map((step, index) => {
          const Icon = STEP_ICONS[index % STEP_ICONS.length] ?? FileText;
          return (
            <li
              key={step.title}
              className="relative flex flex-col justify-between rounded-[26px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-6 transition duration-200 hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent-text)]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    {stepLabel} 0{index + 1}
                  </span>
                </div>

                <h3 className="mt-5 text-xl font-bold tracking-tight text-[var(--text-primary)]">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {step.description}
                </p>
              </div>

              {advanceLabel ? (
                <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--accent-text)] opacity-80">
                  <span>{advanceLabel}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
