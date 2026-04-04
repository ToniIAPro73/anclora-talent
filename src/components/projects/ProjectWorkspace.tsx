'use client';

import { useTransition, useState } from 'react';
import Link from 'next/link';
import { Check, Loader2 } from 'lucide-react';
import { ChapterOrganizer } from './ChapterOrganizer';
import { RichTextEditor } from './RichTextEditor';
import { saveChapterContentAction, saveProjectDocumentAction } from '@/lib/projects/actions';
import { premiumPrimaryDarkButton, premiumSecondaryLightButton } from '@/components/ui/button-styles';
import type { ProjectRecord } from '@/lib/projects/types';
import type { AppMessages } from '@/lib/i18n/messages';

function blocksToHtml(
  blocks: ProjectRecord['document']['chapters'][number]['blocks'],
): string {
  // If the first block already contains HTML (from a previous Tiptap save), use it directly
  if (blocks.length === 1 && blocks[0].content.trimStart().startsWith('<')) {
    return blocks[0].content;
  }

  return blocks
    .map((block) => {
      const escaped = block.content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      if (block.type === 'heading') return `<h2>${escaped}</h2>`;
      if (block.type === 'quote') return `<blockquote><p>${escaped}</p></blockquote>`;
      return `<p>${escaped}</p>`;
    })
    .join('');
}

type SaveState = 'idle' | 'saving' | 'saved';

export function ProjectWorkspace({
  project,
  copy,
}: {
  project: ProjectRecord;
  copy: AppMessages['project'];
}) {
  const [activeChapterId, setActiveChapterId] = useState(
    project.document.chapters[0]?.id ?? '',
  );
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [isPending, startTransition] = useTransition();

  const activeChapter =
    project.document.chapters.find((ch) => ch.id === activeChapterId) ??
    project.document.chapters[0];

  const handleChapterContentUpdate = (html: string) => {
    const formData = new FormData();
    formData.set('projectId', project.id);
    formData.set('chapterId', activeChapter.id);
    formData.set('chapterTitle', activeChapter.title);
    formData.set('htmlContent', html);

    setSaveState('saving');
    startTransition(async () => {
      await saveChapterContentAction(formData);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    });
  };

  return (
    <div className="space-y-6" data-testid="project-workspace">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
            {copy.editorEyebrow}
          </p>
          <h2 className="mt-2 text-4xl font-black tracking-tight text-[var(--text-primary)]">
            {project.title}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {saveState === 'saving' && (
            <span className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
              <Loader2 className="h-3 w-3 animate-spin" />
              Guardando...
            </span>
          )}
          {saveState === 'saved' && !isPending && (
            <span className="flex items-center gap-1.5 text-xs text-[var(--accent-mint)]">
              <Check className="h-3 w-3" />
              Guardado
            </span>
          )}
          <Link href={`/projects/${project.id}/preview`} className={`${premiumSecondaryLightButton} px-5`}>
            {copy.editorOpenPreview}
          </Link>
          <Link href={`/projects/${project.id}/cover`} className={`${premiumPrimaryDarkButton} px-5`}>
            {copy.editorOpenCover}
          </Link>
        </div>
      </div>

      {/* Workspace body */}
      <div className="grid gap-6 xl:grid-cols-[220px_1fr]">
        {/* Chapter sidebar */}
        <div className="xl:sticky xl:top-6 xl:self-start">
          <ChapterOrganizer
            chapters={project.document.chapters}
            activeChapterId={activeChapterId}
            onSelect={setActiveChapterId}
          />
        </div>

        {/* Editor area */}
        <div className="space-y-4">
          {/* Document metadata (title + subtitle) */}
          <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-6 shadow-[var(--shadow-strong)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
              {copy.editorMetaEyebrow}
            </p>
            <form action={saveProjectDocumentAction} className="mt-4 space-y-4">
              <input type="hidden" name="projectId" value={project.id} />
              <input type="hidden" name="chapterId" value={activeChapter.id} />
              <input type="hidden" name="chapterTitle" value={activeChapter.title} />
              {activeChapter.blocks.map((block) => (
                <span key={block.id}>
                  <input type="hidden" name="blockId" value={block.id} />
                  <input type="hidden" name="blockContent" value={block.content} />
                </span>
              ))}
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.editorTitleLabel}</span>
                <input
                  name="title"
                  defaultValue={project.document.title}
                  className="w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-mint)]"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.editorSubtitleLabel}</span>
                <textarea
                  name="subtitle"
                  defaultValue={project.document.subtitle}
                  className="min-h-24 w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-mint)]"
                />
              </label>
              <button type="submit" className={`${premiumSecondaryLightButton} px-5`}>
                {copy.saveChanges}
              </button>
            </form>
          </section>

          {/* Chapter content editor */}
          <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-6 shadow-[var(--shadow-strong)]">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
                {copy.editorLiveEyebrow}
              </p>
              <h3 className="mt-2 text-xl font-black tracking-tight text-[var(--text-primary)]">
                {activeChapter.title}
              </h3>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{copy.editorLiveDescription}</p>
            </div>
            <RichTextEditor
              key={activeChapter.id}
              defaultContent={blocksToHtml(activeChapter.blocks)}
              onUpdate={handleChapterContentUpdate}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
