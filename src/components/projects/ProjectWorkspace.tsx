'use client';

import { useEffect, useTransition, useState, useMemo } from 'react';
import { Check, Loader2, BookOpen, FileText, Palette, Users, Sparkles, Download, Monitor } from 'lucide-react';
import { Stepper, type Step } from '@/components/ui/Stepper';
import { ChapterOrganizer } from './ChapterOrganizer';
import { RichTextEditor } from './RichTextEditor';
import { CoverForm } from './CoverForm';
import { BackCoverForm } from './BackCoverForm';
import { PreviewCanvas } from './PreviewCanvas';
import { TemplateSelector } from './TemplateSelector';
import { CollaborationPanel } from './CollaborationPanel';
import { AIAssistant } from './AIAssistant';
import { saveChapterContentAction, saveProjectDocumentAction, saveProjectCoverAction } from '@/lib/projects/actions';
import { premiumPrimaryDarkButton, premiumSecondaryLightButton } from '@/components/ui/button-styles';
import { SubmitButton } from '@/components/ui/SubmitButton';
import type { ProjectRecord } from '@/lib/projects/types';
import type { AppMessages } from '@/lib/i18n/messages';

function blocksToHtml(
  blocks: ProjectRecord['document']['chapters'][number]['blocks'],
): string {
  return blocks
    .map((block) => {
      if (block.content.trimStart().startsWith('<')) {
        return block.content;
      }

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
  const [activeStep, setActiveStep] = useState(1);
  const [activeChapterId, setActiveChapterId] = useState(
    project.document.chapters[0]?.id ?? '',
  );
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [isPending, startTransition] = useTransition();

  const activeChapter =
    project.document.chapters.find((ch) => ch.id === activeChapterId) ??
    project.document.chapters[0];

  useEffect(() => {
    if (!project.document.chapters.some((chapter) => chapter.id === activeChapterId)) {
      setActiveChapterId(project.document.chapters[0]?.id ?? '');
    }
  }, [activeChapterId, project.document.chapters]);

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

  const handleTemplateSelect = (templateId: string) => {
    const formData = new FormData();
    formData.set('projectId', project.id);
    formData.set('title', project.cover.title);
    formData.set('subtitle', project.cover.subtitle);
    formData.set('palette', templateId);
    formData.set('currentBackgroundImageUrl', project.cover.backgroundImageUrl ?? '');
    formData.set('currentThumbnailUrl', project.cover.thumbnailUrl ?? '');

    setSaveState('saving');
    startTransition(async () => {
      await saveProjectCoverAction(formData);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    });
  };

  const steps: Step[] = useMemo(() => [
    { id: 1, title: copy.stepContent, description: copy.stepContentDesc, status: activeStep === 1 ? 'active' : activeStep > 1 ? 'completed' : 'pending' },
    { id: 2, title: copy.stepChapters, description: copy.stepChaptersDesc, status: activeStep === 2 ? 'active' : activeStep > 2 ? 'completed' : 'pending' },
    { id: 3, title: copy.stepTemplate, description: copy.stepTemplateDesc, status: activeStep === 3 ? 'active' : activeStep > 3 ? 'completed' : 'pending' },
    { id: 4, title: copy.stepCover, description: copy.stepCoverDesc, status: activeStep === 4 ? 'active' : activeStep > 4 ? 'completed' : 'pending' },
    { id: 5, title: copy.stepBackCover, description: copy.stepBackCoverDesc, status: activeStep === 5 ? 'active' : activeStep > 5 ? 'completed' : 'pending' },
    { id: 6, title: copy.stepPreview, description: copy.stepPreviewDesc, status: activeStep === 6 ? 'active' : activeStep > 6 ? 'completed' : 'pending' },
    { id: 7, title: copy.stepCollaborate, description: copy.stepCollaborateDesc, status: activeStep === 7 ? 'active' : activeStep > 7 ? 'completed' : 'pending' },
    { id: 8, title: copy.stepAI, description: copy.stepAIDesc, status: activeStep === 8 ? 'active' : activeStep > 8 ? 'completed' : 'pending' },
    { id: 9, title: copy.stepExport, description: copy.stepExportDesc, status: activeStep === 9 ? 'active' : activeStep > 9 ? 'completed' : 'pending' },
  ], [activeStep, copy]);

  const renderStepContent = () => {
    switch (activeStep) {
      case 1: // Content
        return (
          <div className="space-y-6">
            <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-6 shadow-[var(--shadow-strong)]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
                {copy.editorMetaEyebrow}
              </p>
              <form action={saveProjectDocumentAction} className="mt-4 space-y-4" data-testid="project-metadata-form">
                <input type="hidden" name="projectId" value={project.id} />
                <input type="hidden" name="chapterId" value={activeChapter.id} />
                <input type="hidden" name="chapterTitle" value={activeChapter.title} />
                {activeChapter.blocks.map((block) => (
                  <span key={block.id}>
                    <input type="hidden" name="blockId" value={block.id} />
                    <input type="hidden" name="blockContent" value={block.content} />
                  </span>
                ))}
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.editorTitleLabel}</span>
                    <input
                      data-testid="project-document-title-input"
                      name="title"
                      defaultValue={project.document.title}
                      className="w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-mint)]"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.editorAuthorLabel}</span>
                    <input
                      data-testid="project-document-author-input"
                      name="author"
                      defaultValue={project.document.author}
                      className="w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-mint)]"
                    />
                  </label>
                </div>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.editorSubtitleLabel}</span>
                  <textarea
                    data-testid="project-document-subtitle-input"
                    name="subtitle"
                    defaultValue={project.document.subtitle}
                    className="min-h-24 w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-mint)]"
                  />
                </label>
                <SubmitButton className={`${premiumSecondaryLightButton} px-5`} data-testid="project-document-save-button">
                  {copy.saveChanges}
                </SubmitButton>
              </form>
            </section>

            <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-6 shadow-[var(--shadow-strong)]">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
                  {copy.editorLiveEyebrow}
                </p>
                <h3 className="mt-2 text-xl font-black tracking-tight text-[var(--text-primary)]" data-testid="active-chapter-title">
                  {activeChapter.title}
                </h3>
              </div>
              <RichTextEditor
                key={activeChapter.id}
                defaultContent={blocksToHtml(activeChapter.blocks)}
                onUpdate={handleChapterContentUpdate}
              />
            </section>
          </div>
        );
      case 2: // Chapters
        return (
          <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-6 shadow-[var(--shadow-strong)]">
            <ChapterOrganizer
              projectId={project.id}
              chapters={project.document.chapters}
              activeChapterId={activeChapterId}
              onSelect={setActiveChapterId}
            />
          </section>
        );
      case 3: // Template
        return (
          <div className="mx-auto max-w-5xl">
            <TemplateSelector
              selectedTemplateId={project.cover.palette}
              onSelect={handleTemplateSelect}
              copy={copy}
            />
          </div>
        );
      case 4: // Cover
        return (
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex justify-end">
              <button
                onClick={() => setIsAdvancedCover(!isAdvancedCover)}
                className={`${premiumSecondaryLightButton} px-4 py-2 text-xs`}
              >
                {isAdvancedCover ? copy.coverSwitchToBasic : copy.coverSwitchToAdvanced}
              </button>
            </div>
            {isAdvancedCover ? (
              <AdvancedCoverEditor project={project} copy={copy} />
            ) : (
              <CoverForm project={project} copy={copy} />
            )}
          </div>
        );
      case 5: // Back Cover
        return (
          <div className="max-w-4xl mx-auto">
            <BackCoverForm project={project} copy={copy} />
          </div>
        );
      case 6: // Preview
        return <PreviewCanvas project={project} copy={copy} />;
      case 7: // Collaborate
        return <CollaborationPanel />;
      case 8: // AI
        return <AIAssistant />;
      case 9: // Export
        return (
          <section className="flex min-h-[400px] flex-col items-center justify-center rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-12 text-center shadow-[var(--shadow-strong)]">
            <Download className="mb-4 h-12 w-12 text-[var(--accent)]" />
            <h3 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">{copy.stepExport}</h3>
            <p className="mt-2 max-w-md text-base text-[var(--text-secondary)]">
              Tu proyecto está listo para ser publicado. Elige el formato de salida deseado.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
               <SubmitButton className={`${premiumPrimaryDarkButton} px-8`}>
                  {copy.previewExportPdfButton} (PDF)
               </SubmitButton>
               <button className={`${premiumSecondaryLightButton} px-8`} disabled>
                  Exportar EPUB (Próximamente)
               </button>
            </div>
          </section>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8" data-testid="project-workspace">
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
            <span className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]" data-testid="project-save-status-saving">
              <Loader2 className="h-3 w-3 animate-spin" />
              Guardando...
            </span>
          )}
          {saveState === 'saved' && !isPending && (
            <span className="flex items-center gap-1.5 text-xs text-[var(--accent-mint)]" data-testid="project-save-status-saved">
              <Check className="h-3 w-3" />
              Guardado
            </span>
          )}
        </div>
      </div>

      {/* Stepper Navigation */}
      <div className="rounded-[32px] border border-[var(--border-subtle)] bg-[var(--page-surface-muted)] p-6 shadow-[var(--shadow-soft)]">
        <Stepper steps={steps} activeStep={activeStep} onStepClick={setActiveStep} />
      </div>

      {/* Step Layout */}
      <div className="grid gap-8 xl:grid-cols-[240px_1fr]">
        {/* Navigation Info */}
        <aside className="space-y-6 xl:sticky xl:top-8 xl:self-start">
           <div className="rounded-[24px] bg-[var(--surface-soft)] p-5 border border-[var(--border-subtle)]">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">Progreso</h4>
              <div className="mt-3 flex items-end gap-2">
                 <span className="text-3xl font-black text-[var(--text-primary)]">{activeStep}</span>
                 <span className="mb-1 text-sm text-[var(--text-tertiary)]">de 9 pasos</span>
              </div>
              <p className="mt-4 text-xs leading-5 text-[var(--text-secondary)]">
                 {steps[activeStep - 1]?.description || 'Sigue el flujo editorial para completar tu publicación premium.'}
              </p>
           </div>

           <div className="flex flex-col gap-3">
              <button
                onClick={() => setActiveStep(prev => Math.max(1, prev - 1))}
                disabled={activeStep === 1}
                className={`${premiumSecondaryLightButton} w-full py-3 text-xs disabled:opacity-30`}
              >
                 Paso anterior
              </button>
              <button
                onClick={() => setActiveStep(prev => Math.min(9, prev + 1))}
                disabled={activeStep === 9}
                className={`${premiumPrimaryDarkButton} w-full py-3 text-xs disabled:opacity-30`}
              >
                 Siguiente paso
              </button>
           </div>
        </aside>

        {/* Dynamic Content Area */}
        <main className="min-h-[600px]">
          {renderStepContent()}
        </main>
      </div>
    </div>
  );
}
