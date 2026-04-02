import { saveProjectDocumentAction } from '@/lib/projects/actions';
import type { ProjectRecord } from '@/lib/projects/types';
import { premiumPrimaryDarkButton, premiumSecondaryLightButton } from '@/components/ui/button-styles';
import type { AppMessages } from '@/lib/i18n/messages';

export function EditorForm({ copy, project }: { copy: AppMessages['project']; project: ProjectRecord }) {
  const chapter = project.document.chapters[0];

  return (
    <form action={saveProjectDocumentAction} className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
      <input type="hidden" name="projectId" value={project.id} />

      <section className="space-y-4 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-6 shadow-[var(--shadow-strong)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">{copy.editorMetaEyebrow}</p>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.editorTitleLabel}</span>
          <input name="title" defaultValue={project.document.title} className="w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-mint)]" />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.editorSubtitleLabel}</span>
          <textarea name="subtitle" defaultValue={project.document.subtitle} className="min-h-28 w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-mint)]" />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.editorChapterLabel}</span>
          <input name="chapterTitle" defaultValue={chapter.title} className="w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-mint)]" />
        </label>
      </section>

      <section className="space-y-4 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-6 shadow-[var(--shadow-strong)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">{copy.editorLiveEyebrow}</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[var(--text-primary)]">{project.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
            {copy.editorLiveDescription}
          </p>
        </div>

        <div className="space-y-4">
          {chapter.blocks.map((block) => (
            <label key={block.id} className="block space-y-2 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-5">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">{block.type}</span>
              <input type="hidden" name="blockId" value={block.id} />
              <textarea
                name="blockContent"
                defaultValue={block.content}
                className="min-h-30 w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-highlight)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-mint)]"
              />
            </label>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="submit" className={`${premiumPrimaryDarkButton} px-5`}>
            {copy.saveChanges}
          </button>
          <a href={`/projects/${project.id}/preview`} className={`${premiumSecondaryLightButton} px-5`}>
            {copy.editorOpenPreview}
          </a>
        </div>
      </section>
    </form>
  );
}
