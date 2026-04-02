import { ArrowRight } from 'lucide-react';
import type { MarketingWorkflowStep } from './marketing-data';

type LandingWorkflowProps = {
  eyebrow: string;
  title: string;
  description: string;
  advanceLabel: string;
  stepLabel: string;
  steps: readonly MarketingWorkflowStep[];
};

export function LandingWorkflow({ advanceLabel, description, eyebrow, stepLabel, steps, title }: LandingWorkflowProps) {
  return (
    <section className="rounded-[34px] border border-[var(--border-subtle)] bg-[var(--page-surface)] px-6 py-8 shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">{eyebrow}</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[var(--text-primary)]">{title}</h2>
        </div>
        <p className="max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
          {description}
        </p>
      </div>

      <ol className="mt-8 grid gap-4 lg:grid-cols-3" role="list">
        {steps.map((step, index) => (
          <li key={step.title} className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface-muted)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-mint)]">
              {stepLabel} {index + 1}
            </p>
            <h3 className="mt-3 text-2xl font-black tracking-tight text-[var(--text-primary)]">{step.title}</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{step.description}</p>
            <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              {advanceLabel}
              <ArrowRight className="h-4 w-4" />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
