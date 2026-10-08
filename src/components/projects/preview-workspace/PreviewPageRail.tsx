'use client';

import { useEffect, useRef, useState } from 'react';
import type { AppMessages } from '@/lib/i18n/messages';
import type { ProjectRecord } from '@/lib/projects/types';
import type { PreviewPage } from '@/lib/preview/preview-builder';
import type { LogicalPage } from '@/lib/preview/preview-workspace';
import { PreviewSurfacePage } from './PreviewSurfacePage';

type Copy = AppMessages['project'];

const THUMB_WIDTH = 104;

function Thumb({
  page,
  source,
  project,
  copy,
  pageWidth,
  pageHeight,
  margins,
  root,
}: {
  page: LogicalPage;
  source: PreviewPage | null;
  project: ProjectRecord;
  copy: Copy;
  pageWidth: number;
  pageHeight: number;
  margins: { top: number; bottom: number; left: number; right: number };
  root: HTMLElement | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Without IntersectionObserver (old runtimes, tests) every miniature simply renders.
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');
  const scale = THUMB_WIDTH / pageWidth;
  const height = Math.round(pageHeight * scale);

  // Miniatures are only built while they are (nearly) on screen: a 200-page book never mounts 200 canvases.
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => setVisible(entries.some((entry) => entry.isIntersecting)),
      { root, rootMargin: '240px 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [root]);

  return (
    <div ref={ref} className="pw-thumb__paper" style={{ width: THUMB_WIDTH, height }}>
      {visible && page.kind === 'content' && source?.content ? (
        <div
          className="pw-thumb__flow"
          aria-hidden="true"
          style={{
            width: pageWidth,
            height: pageHeight,
            transform: `scale(${scale})`,
            padding: `${margins.top}px ${margins.right}px ${margins.bottom}px ${margins.left}px`,
          }}
          dangerouslySetInnerHTML={{ __html: source.content }}
        />
      ) : null}
      {visible && page.kind !== 'content' && source ? (
        <div className="pw-thumb__surface" aria-hidden="true">
          <PreviewSurfacePage page={source} project={project} copy={copy} width={THUMB_WIDTH} height={height} thumbnail />
        </div>
      ) : null}
    </div>
  );
}

export function PreviewPageRail({
  copy,
  project,
  pages,
  sources,
  currentIndex,
  highlightIndices,
  onSelect,
  pageWidth,
  pageHeight,
  margins,
  styleVariables,
}: {
  copy: Copy;
  project: ProjectRecord;
  pages: LogicalPage[];
  /** Canonical page behind each logical page (same index), when the composition has it. */
  sources: Array<PreviewPage | null>;
  currentIndex: number;
  /** Pages visible in the stage (both sides of a spread). */
  highlightIndices: number[];
  onSelect: (index: number) => void;
  pageWidth: number;
  pageHeight: number;
  margins: { top: number; bottom: number; left: number; right: number };
  styleVariables: Record<string, string>;
}) {
  const [listElement, setListElement] = useState<HTMLElement | null>(null);

  // Keep the active miniature in view while navigating.
  useEffect(() => {
    listElement?.querySelector('[aria-current="page"]')?.scrollIntoView?.({ block: 'nearest' });
  }, [currentIndex, listElement]);

  const labelFor = (page: LogicalPage) =>
    page.kind === 'cover' ? copy.pwCoverFront : page.kind === 'back-cover' ? copy.pwCoverBack : String(page.printedNumber ?? page.index + 1);

  return (
    <div className="pw-rail__body">
      <h2 className="pw-rail__title">{copy.pwRailTitle}</h2>
      <ul
        ref={setListElement}
        className="pw-rail__list"
        role="listbox"
        aria-label={copy.pwRailTitle}
        data-testid="preview-page-rail-list"
        style={styleVariables as React.CSSProperties}
      >
        {pages.map((page) => {
          const selected = highlightIndices.includes(page.index) || page.index === currentIndex;
          return (
            <li key={page.index} role="presentation" className="pw-rail__item">
              <button
                type="button"
                role="option"
                className="pw-thumb"
                data-testid={`preview-thumb-${page.index}`}
                data-page-kind={page.kind}
                aria-selected={selected}
                aria-current={page.index === currentIndex ? 'page' : undefined}
                aria-label={page.kind === 'content' ? copy.pwThumbPage.replace('{n}', labelFor(page)) : labelFor(page)}
                onClick={() => onSelect(page.index)}
              >
                <Thumb page={page} source={sources[page.index] ?? null} project={project} copy={copy} pageWidth={pageWidth} pageHeight={pageHeight} margins={margins} root={listElement} />
                <span className="pw-thumb__label">{labelFor(page)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
