'use client';

import { Book, Check, Eye, Palette, SquareStack } from 'lucide-react';
import type { AppMessages } from '@/lib/i18n/messages';
import {
  BACK_COVER_TEMPLATES,
  COVER_TEMPLATES,
  type EditorialTemplate,
} from '@/lib/projects/cover-templates';

const PREVIEW_TONE_CLASS: Record<EditorialTemplate['previewTone'], string> = {
  obsidian: 'bg-[#0b133f]',
  teal: 'bg-[#124a50]',
  sand: 'bg-[#f2e3b3]',
};

const TONE_ICON_CLASS: Record<EditorialTemplate['previewTone'], string> = {
  obsidian: 'text-[#f2e3b3]',
  teal: 'text-[#d8fff6]',
  sand: 'text-[#0b313f]',
};

function getTemplateFeatures(template: EditorialTemplate) {
  return [
    template.category,
    template.layout.kind,
    Object.entries(template.visibility ?? {})
      .filter(([, visible]) => visible)
      .map(([field]) => field)
      .join(' + '),
  ].filter(Boolean);
}

function TemplateGrid({
  title,
  description,
  templates,
  selectedTemplateId,
  onSelect,
  testId,
}: {
  title: string;
  description: string;
  templates: EditorialTemplate[];
  selectedTemplateId: string;
  onSelect: (id: string) => void;
  testId: string;
}) {
  return (
    <section
      className="space-y-5 rounded-[32px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-6 shadow-[var(--shadow-soft)]"
      data-testid={testId}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] text-[var(--accent)]">
          <SquareStack className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-xl font-black tracking-tight text-[var(--text-primary)]">{title}</h4>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => {
          const isSelected = selectedTemplateId === template.id;
          const features = getTemplateFeatures(template);
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template.id)}
              className={`group relative flex flex-col overflow-hidden rounded-[28px] border text-left transition-all duration-300 ${
                isSelected
                  ? 'border-[var(--accent)] bg-[var(--surface-soft)] ring-4 ring-[var(--accent-glow)]'
                  : 'border-[var(--border-subtle)] bg-[var(--page-surface)] hover:border-[var(--border-strong)]'
              }`}
            >
              <div
                className={`relative flex aspect-[4/3] w-full items-center justify-center ${PREVIEW_TONE_CLASS[template.previewTone]} transition-transform duration-500 group-hover:scale-[1.02]`}
              >
                <Book className={`h-12 w-12 ${TONE_ICON_CLASS[template.previewTone]}`} />
                {isSelected && (
                  <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg">
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h5 className="text-lg font-black tracking-tight text-[var(--text-primary)]">{template.name}</h5>
                <p className="mt-2 text-xs leading-5 text-[var(--text-tertiary)]">{template.description}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {features.map((feature) => (
                    <span
                      key={`${template.id}-${feature}`}
                      className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]"
                    >
                      {feature}
                    </span>
                  ))}
                </div>

                <div className="mt-auto flex items-center justify-between pt-6">
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest ${
                      isSelected ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'
                    }`}
                  >
                    {isSelected ? 'Seleccionada' : 'Seleccionar'}
                  </span>
                  <Eye className="h-4 w-4 text-[var(--text-tertiary)] opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function TemplateSelector({
  selectedCoverTemplateId,
  selectedBackCoverTemplateId,
  onSelectCover,
  onSelectBackCover,
}: {
  selectedCoverTemplateId: string;
  selectedBackCoverTemplateId: string;
  onSelectCover: (id: string) => void;
  onSelectBackCover: (id: string) => void;
  copy: AppMessages['project'];
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">Sistema de plantillas editoriales</h3>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Elige por separado la direccion visual de la portada y la composicion de la contraportada.
        </p>
      </div>

      <TemplateGrid
        title="Plantillas de portada"
        description="Definen jerarquia, tono y estructura visual de la cubierta frontal."
        templates={COVER_TEMPLATES}
        selectedTemplateId={selectedCoverTemplateId}
        onSelect={onSelectCover}
        testId="cover-template-catalog"
      />

      <TemplateGrid
        title="Plantillas de contraportada"
        description="Definen el balance entre sinopsis, bio y mensaje de cierre de la cubierta trasera."
        templates={BACK_COVER_TEMPLATES}
        selectedTemplateId={selectedBackCoverTemplateId}
        onSelect={onSelectBackCover}
        testId="back-cover-template-catalog"
      />

      <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-highlight)] p-6 text-center">
        <Palette className="mx-auto mb-3 h-6 w-6 text-[var(--accent)]" />
        <p className="text-sm font-semibold text-[var(--text-primary)]">Las plantillas ya no son solo cosmeticas</p>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Cada preset ajusta tono visual, layout y visibilidad recomendada sobre el mismo modelo compartido de portada y contraportada.
        </p>
      </div>
    </div>
  );
}
