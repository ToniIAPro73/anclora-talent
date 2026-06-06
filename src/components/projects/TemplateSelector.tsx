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
      className="ac-template-catalog ac-surface-panel talent-workspace-stage__panel p-6"
      data-testid={testId}
    >
      <div className="ac-template-catalog__header">
        <div className="ac-template-catalog__mark">
          <SquareStack className="h-5 w-5" />
        </div>
        <div className="ac-template-catalog__titles">
          <h4 className="ac-template-catalog__title">{title}</h4>
          <p className="ac-template-catalog__summary">{description}</p>
        </div>
      </div>

      <div className="ac-template-catalog__grid">
        {templates.map((template) => {
          const isSelected = selectedTemplateId === template.id;
          const features = getTemplateFeatures(template);
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template.id)}
              className="ac-template-card group"
              data-selected={isSelected ? 'true' : 'false'}
            >
              <div
                className={`ac-template-card__preview ${PREVIEW_TONE_CLASS[template.previewTone]} transition-transform duration-500 group-hover:scale-[1.02]`}
              >
                <Book className={`h-12 w-12 ${TONE_ICON_CLASS[template.previewTone]}`} />
                {isSelected && (
                  <div className="ac-template-card__selected">
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </div>

              <div className="ac-template-card__body">
                <h5 className="ac-template-card__title">{template.name}</h5>
                <p className="ac-template-card__summary">{template.description}</p>

                <div className="ac-template-card__tags">
                  {features.map((feature) => (
                    <span
                      key={`${template.id}-${feature}`}
                      className="ac-template-card__tag"
                    >
                      {feature}
                    </span>
                  ))}
                </div>

                <div className="ac-template-card__footer">
                  <span className="ac-template-card__status">
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
      <div className="ac-section-heading place-items-center text-center">
        <h3 className="ac-section-heading__title max-w-none text-2xl">Sistema de plantillas editoriales</h3>
        <p className="ac-section-heading__summary mt-2 text-sm">
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

      <div className="ac-surface-panel ac-surface-panel--subtle p-6 text-center">
        <Palette className="mx-auto mb-3 h-6 w-6 text-[var(--accent)]" />
        <p className="text-sm font-semibold text-[var(--text-primary)]">Las plantillas ya no son solo cosmeticas</p>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Cada preset ajusta tono visual, layout y visibilidad recomendada sobre el mismo modelo compartido de portada y contraportada.
        </p>
      </div>
    </div>
  );
}
