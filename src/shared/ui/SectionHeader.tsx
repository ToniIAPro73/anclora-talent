import type { ReactNode } from 'react';

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-teal">
          {eyebrow}
        </p>
        <div className="space-y-2">
          <h1 className="font-headline text-4xl font-black tracking-tight text-ink sm:text-5xl">
            {title}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted">{description}</p>
        </div>
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
