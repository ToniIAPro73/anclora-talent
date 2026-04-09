'use client';

import { useTransition, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, Download } from 'lucide-react';
import { Stepper, type Step } from '@/components/ui/Stepper';
import { ChapterOrganizer } from './ChapterOrganizer';
import { DocumentStatsCard } from './DocumentStatsCard';
import { CoverForm } from './CoverForm';
import { AdvancedCoverEditor } from './advanced-cover/AdvancedCoverEditor';
import { BackCoverForm } from './BackCoverForm';
import { AdvancedBackCoverEditor } from './advanced-back-cover/AdvancedBackCoverEditor';
import { PreviewCanvas } from './PreviewCanvas';
import { TemplateSelector } from './TemplateSelector';
import { CollaborationPanel } from './CollaborationPanel';
import { AIAssistant } from './AIAssistant';
import { ChapterEditorModal } from './ChapterEditorModal';
import { AddChapterDialog } from './AddChapterDialog';
import { ImportChapterDialog } from './ImportChapterDialog';
import { Portal } from '@/components/ui/Portal';
import { saveBackCoverAction, saveProjectDocumentAction, saveProjectCoverAction } from '@/lib/projects/actions';
import { computeChapterPageMetrics } from '@/lib/preview/metrics';
import { premiumPrimaryDarkButton, premiumSecondaryLightButton } from '@/components/ui/button-styles';
import { SubmitButton } from '@/components/ui/SubmitButton';
import {
  BACK_COVER_TEMPLATES,
  COVER_TEMPLATES,
  type EditorialTemplate,
} from '@/lib/projects/cover-templates';
import {
  applySurfaceTemplate,
  createDefaultSurfaceState,
  normalizeSurfaceState,
} from '@/lib/projects/cover-surface';
import type { ProjectRecord } from '@/lib/projects/types';
import type { AppMessages } from '@/lib/i18n/messages';

const TEMPLATE_TONE_TO_PALETTE: Record<EditorialTemplate['previewTone'], ProjectRecord['cover']['palette']> = {
  obsidian: 'obsidian',
  teal: 'teal',
  sand: 'sand',
};

function buildCoverSurface(project: ProjectRecord) {
  const fallback = createDefaultSurfaceState('cover');
  fallback.fields.title = { value: project.cover.title, visible: Boolean(project.cover.title.trim()) };
  fallback.fields.subtitle = {
    value: project.cover.subtitle,
    visible: Boolean((project.cover.showSubtitle ?? true) && project.cover.subtitle.trim()),
  };
  fallback.fields.author = {
    value: project.document.author,
    visible: Boolean(project.document.author.trim()),
  };

  return normalizeSurfaceState(project.cover.surfaceState ?? fallback);
}

function buildBackCoverSurface(project: ProjectRecord) {
  const fallback = createDefaultSurfaceState('back-cover');
  fallback.fields.title = { value: project.backCover.title, visible: Boolean(project.backCover.title.trim()) };
  fallback.fields.body = { value: project.backCover.body, visible: Boolean(project.backCover.body.trim()) };
  fallback.fields.authorBio = {
    value: project.backCover.authorBio,
    visible: Boolean(project.backCover.authorBio.trim()),
  };

  return normalizeSurfaceState(project.backCover.surfaceState ?? fallback);
}

function inferTemplateId(
  templates: EditorialTemplate[],
  layoutKind: string | undefined,
  fallbackId: string,
) {
  return templates.find((template) => template.layout.kind === layoutKind)?.id ?? fallbackId;
}

type SaveState = 'idle' | 'saving' | 'saved';

export function ProjectWorkspace({
  project,
  copy,
}: {
  project: ProjectRecord;
  copy: AppMessages['project'];
}) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(1);
  const [isAdvancedCover, setIsAdvancedCover] = useState(false);
  const [isAdvancedBackCover, setIsAdvancedBackCover] = useState(false);
  const [activeChapterId, setActiveChapterId] = useState(
    project.document.chapters[0]?.id ?? '',
  );
  
  // Modal states
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const initialCoverSurface = useMemo(() => buildCoverSurface(project), [project]);
  const initialBackCoverSurface = useMemo(() => buildBackCoverSurface(project), [project]);
  const [selectedCoverTemplateId, setSelectedCoverTemplateId] = useState(
    inferTemplateId(COVER_TEMPLATES, initialCoverSurface.layout.kind, COVER_TEMPLATES[0]?.id ?? ''),
  );
  const [selectedBackCoverTemplateId, setSelectedBackCoverTemplateId] = useState(
    inferTemplateId(
      BACK_COVER_TEMPLATES,
      initialBackCoverSurface.layout.kind,
      BACK_COVER_TEMPLATES[0]?.id ?? '',
    ),
  );
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [isPending, startTransition] = useTransition();

  const resolvedActiveChapterId = project.document.chapters.some((chapter) => chapter.id === activeChapterId)
    ? activeChapterId
    : (project.document.chapters[0]?.id ?? '');
  const activeChapter =
    project.document.chapters.find((ch) => ch.id === resolvedActiveChapterId) ??
    project.document.chapters[0];

  const editingChapterIndex = useMemo(
    () => project.document.chapters.findIndex((ch) => ch.id === editingChapterId),
    [project.document.chapters, editingChapterId],
  );

  // Compute chapter page metrics (Commit 3)
  const chapterMetricsById = useMemo(() => {
    const metrics = computeChapterPageMetrics(project);
    return Object.fromEntries(metrics.map((m) => [m.chapterId, m]));
  }, [project]);

  const handleCoverTemplateSelect = (templateId: string) => {
    const template = COVER_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;

    setSelectedCoverTemplateId(templateId);

    const nextSurface = applySurfaceTemplate(initialCoverSurface, template);
    const formData = new FormData();
    formData.set('projectId', project.id);
    formData.set('title', nextSurface.fields.title?.value ?? project.cover.title);
    formData.set('subtitle', nextSurface.fields.subtitle?.value ?? project.cover.subtitle);
    formData.set('palette', TEMPLATE_TONE_TO_PALETTE[template.previewTone]);
    formData.set('currentBackgroundImageUrl', project.cover.backgroundImageUrl ?? '');
    formData.set('currentThumbnailUrl', project.cover.thumbnailUrl ?? '');
    formData.set('layout', project.cover.layout || 'centered');
    formData.set('showSubtitle', String(nextSurface.fields.subtitle?.visible ?? false));
    formData.set('accentColor', project.cover.accentColor ?? '');
    formData.set('fontFamily', project.cover.fontFamily ?? '');
    formData.set('surfaceState', JSON.stringify(nextSurface));

    setSaveState('saving');
    startTransition(async () => {
      await saveProjectCoverAction(formData);
      router.refresh();
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    });
  };

  const handleBackCoverTemplateSelect = (templateId: string) => {
    const template = BACK_COVER_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;

    setSelectedBackCoverTemplateId(templateId);

    const nextSurface = applySurfaceTemplate(initialBackCoverSurface, template);
    const formData = new FormData();
    formData.set('projectId', project.id);
    formData.set('title', nextSurface.fields.title?.value ?? project.backCover.title);
    formData.set('body', nextSurface.fields.body?.value ?? project.backCover.body);
    formData.set('authorBio', nextSurface.fields.authorBio?.value ?? project.backCover.authorBio);
    formData.set('accentColor', project.backCover.accentColor ?? '');
    formData.set('currentBackgroundImageUrl', project.backCover.backgroundImageUrl ?? '');
    formData.set('surfaceState', JSON.stringify(nextSurface));

    setSaveState('saving');
    startTransition(async () => {
      await saveBackCoverAction(formData);
      router.refresh();
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
          <div className="flex flex-col gap-6">
            {/* Metadata Card - Full Width */}
            <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-8 shadow-[var(--shadow-strong)]">
              <div className="mb-6 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
                  {copy.editorMetaEyebrow}
                </p>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold text-blue-600 border border-blue-100">
                  Máx. 50MB
                </span>
              </div>
              <form action={saveProjectDocumentAction} className="space-y-6" data-testid="project-metadata-form">
                <input type="hidden" name="projectId" value={project.id} />
                <input type="hidden" name="chapterId" value={activeChapter.id} />
                <input type="hidden" name="chapterTitle" value={activeChapter.title} />
                <div className="grid gap-6 md:grid-cols-2">
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
                    className="min-h-32 w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-mint)]"
                  />
                </label>
                <div className="flex justify-end">
                  <SubmitButton className={`${premiumSecondaryLightButton} px-8 py-3`} data-testid="project-document-save-button">
                    {copy.saveChanges}
                  </SubmitButton>
                </div>
              </form>
            </section>

            <DocumentStatsCard document={project.document} project={project} isLoading={isPending} />
          </div>
        );
      case 2: // Chapters
        return (
          <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-6 shadow-[var(--shadow-strong)]">
            <ChapterOrganizer
              projectId={project.id}
              chapters={project.document.chapters}
              activeChapterId={resolvedActiveChapterId}
              onSelect={setActiveChapterId}
              onEditChapter={setEditingChapterId}
              onAddChapter={() => setIsAddDialogOpen(true)}
              onImportChapter={() => setIsImportDialogOpen(true)}
              metricsById={chapterMetricsById}
            />
          </section>
        );
      case 3: // Template
        return (
          <div className="mx-auto max-w-5xl">
            <TemplateSelector
              selectedCoverTemplateId={selectedCoverTemplateId}
              selectedBackCoverTemplateId={selectedBackCoverTemplateId}
              onSelectCover={handleCoverTemplateSelect}
              onSelectBackCover={handleBackCoverTemplateSelect}
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
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex justify-end">
              <button
                onClick={() => setIsAdvancedBackCover(!isAdvancedBackCover)}
                className={`${premiumSecondaryLightButton} px-4 py-2 text-xs`}
              >
                {isAdvancedBackCover ? copy.coverSwitchToBasic : copy.coverSwitchToAdvanced}
              </button>
            </div>
            {isAdvancedBackCover ? (
              <AdvancedBackCoverEditor project={project} copy={copy} />
            ) : (
              <BackCoverForm project={project} copy={copy} />
            )}
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
               <button
                 onClick={() => {
                   const pdfUrl = `/api/projects/export/pdf?projectId=${project.id}`;
                   window.open(pdfUrl, '_blank');
                 }}
                 className={`${premiumPrimaryDarkButton} px-8 cursor-pointer hover:cursor-pointer`}
               >
                  Exportar formato PDF
               </button>
               <button className={`${premiumSecondaryLightButton} px-8 opacity-30 cursor-default`} disabled>
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
                className={`${premiumSecondaryLightButton} w-full py-3 text-xs disabled:opacity-30 disabled:cursor-default cursor-pointer`}
              >
                 Paso anterior
              </button>
              <button
                onClick={() => setActiveStep(prev => Math.min(9, prev + 1))}
                disabled={activeStep === 9}
                className={`${premiumPrimaryDarkButton} w-full py-3 text-xs disabled:opacity-30 disabled:cursor-default cursor-pointer`}
              >
                 Siguiente paso
              </button>
           </div>
        </aside>

        <main className="min-h-[600px]">
          {renderStepContent()}
        </main>
      </div>

      {/* Modals rendered via Portal to escape any transform/backdrop-filter trapping */}
      <Portal>
        {editingChapterId !== null && editingChapterIndex >= 0 && (
          <ChapterEditorModal
            chapters={project.document.chapters}
            currentChapterIndex={editingChapterIndex}
            isOpen={editingChapterId !== null}
            projectId={project.id}
            onClose={() => setEditingChapterId(null)}
          />
        )}

        <AddChapterDialog
          isOpen={isAddDialogOpen}
          projectId={project.id}
          chapters={project.document.chapters}
          onClose={() => setIsAddDialogOpen(false)}
        />

        <ImportChapterDialog
          isOpen={isImportDialogOpen}
          projectId={project.id}
          chapters={project.document.chapters}
          onClose={() => setIsImportDialogOpen(false)}
        />
      </Portal>
    </div>
  );
}
