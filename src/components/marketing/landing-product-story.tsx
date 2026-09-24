'use client';

import { useState } from 'react';
import Image from 'next/image';
import { BookOpen, Columns, Layers } from 'lucide-react';

export type ProductMoment = {
  id: string;
  badge: string;
  title: string;
  description: string;
  pills: readonly string[];
  imageDark: string;
  imageLight: string;
  altDark: string;
  altLight: string;
  backImageDark?: string;
  backImageLight?: string;
  backAltDark?: string;
  backAltLight?: string;
  hasBackCoverToggle?: boolean;
};

type LandingProductStoryProps = {
  id?: string;
  eyebrow: string;
  title: string;
  description: string;
  moments: readonly ProductMoment[];
  frontLabel?: string;
  backLabel?: string;
  viewLabel?: string;
};

export function LandingProductStory({
  id = 'producto',
  eyebrow,
  title,
  description,
  moments,
  frontLabel = 'Portada',
  backLabel = 'Contraportada',
  viewLabel = 'Vista:',
}: LandingProductStoryProps) {
  const [coverView, setCoverView] = useState<'front' | 'back'>('front');
  const titleId = `${id}-title`;

  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className="scroll-mt-20 rounded-[36px] border border-[var(--border-subtle)] bg-[var(--shell-main-surface)] px-5 py-8 text-[var(--text-primary)] shadow-[var(--shadow-strong)] sm:px-8 sm:py-12 lg:px-12 lg:py-16"
    >
      {/* Section Heading */}
      <div className="flex flex-col gap-4 border-b border-[var(--border-subtle)] pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-text)]">
            {eyebrow}
          </p>
          <h2
            id={titleId}
            className="mt-3 max-w-2xl text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl lg:text-4xl font-editorial"
          >
            {title}
          </h2>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
          {description}
        </p>
      </div>

      {/* 3 Real Product Moments */}
      <div className="mt-10 flex flex-col gap-14 sm:gap-16 lg:gap-20">
        {moments.map((moment, index) => {
          const isReversed = index % 2 === 1;
          const Icon = index === 0 ? BookOpen : index === 1 ? Columns : Layers;

          return (
            <article
              key={moment.id}
              className={`grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-12 ${
                isReversed ? 'lg:grid-flow-dense' : ''
              }`}
            >
              {/* Copy Column */}
              <div className={isReversed ? 'lg:col-start-2' : ''}>
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-medium text-[var(--accent-text)]">
                  <Icon className="h-3.5 w-3.5" />
                  <span>{moment.badge}</span>
                </div>

                <h3 className="mt-4 text-xl font-bold text-[var(--text-primary)] sm:text-2xl font-editorial leading-snug">
                  {moment.title}
                </h3>

                <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
                  {moment.description}
                </p>

                {/* Key feature pills */}
                <div className="mt-5 flex flex-wrap gap-2">
                  {moment.pills.map((pill) => (
                    <span
                      key={pill}
                      className="inline-flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]"
                    >
                      {pill}
                    </span>
                  ))}
                </div>

                {/* Surface toggle for Moment 3 (Cover Studio) */}
                {moment.hasBackCoverToggle ? (
                  <div className="mt-6 flex items-center gap-2">
                    <span className="text-xs font-medium text-[var(--text-tertiary)] mr-1">
                      {viewLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCoverView('front')}
                      aria-pressed={coverView === 'front'}
                      className={`ac-button ac-button--compact ${
                        coverView === 'front'
                          ? 'ac-button--primary'
                          : 'ac-button--secondary'
                      }`}
                    >
                      {frontLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverView('back')}
                      aria-pressed={coverView === 'back'}
                        className={`ac-button ac-button--compact ${
                          coverView === 'back'
                          ? 'ac-button--primary'
                          : 'ac-button--secondary'
                      }`}
                    >
                      {backLabel}
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Screenshot Media Column */}
              <div className={isReversed ? 'lg:col-start-1' : ''}>
                <div className="group relative overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] shadow-xl transition-all duration-300 hover:shadow-2xl">
                  <div className="relative aspect-[16/10] w-full bg-[var(--background)]">
                    {moment.hasBackCoverToggle && coverView === 'back' && moment.backImageDark ? (
                      <>
                        <div className="theme-dark-only relative h-full w-full">
                          <Image
                            src={moment.backImageDark}
                            alt={moment.backAltDark || moment.altDark}
                            fill
                            sizes="(max-width: 1024px) 100vw, 600px"
                            className="object-cover object-top"
                          />
                        </div>
                        <div className="theme-light-only relative h-full w-full">
                          <Image
                            src={moment.backImageLight || moment.backImageDark}
                            alt={moment.backAltLight || moment.altLight}
                            fill
                            sizes="(max-width: 1024px) 100vw, 600px"
                            className="object-cover object-top"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="theme-dark-only relative h-full w-full">
                          <Image
                            src={moment.imageDark}
                            alt={moment.altDark}
                            fill
                            sizes="(max-width: 1024px) 100vw, 600px"
                            className="object-cover object-top"
                          />
                        </div>
                        <div className="theme-light-only relative h-full w-full">
                          <Image
                            src={moment.imageLight}
                            alt={moment.altLight}
                            fill
                            sizes="(max-width: 1024px) 100vw, 600px"
                            className="object-cover object-top"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
