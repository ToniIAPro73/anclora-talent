'use client';

import { useState } from 'react';
import { Book, Check, GraduationCap, Magnet, Package, Wrench } from 'lucide-react';
import type { AppMessages } from '@/lib/i18n/messages';
import {
  PRODUCT_TEMPLATES,
  type ProductTemplateId,
} from '@/lib/templates/product-templates';

const TEMPLATE_ICONS: Record<ProductTemplateId, typeof Book> = {
  'standard-book': Book,
  'technical-manual': Wrench,
  'lead-magnet': Magnet,
  'modular-course': GraduationCap,
  bundle: Package,
};

export function ProductTemplateSelector({ copy }: { copy: AppMessages['project'] }) {
  const [selectedId, setSelectedId] = useState<ProductTemplateId>(PRODUCT_TEMPLATES[0].id);

  return (
    <div className="mt-6" data-testid="product-template-selector">
      <input
        type="hidden"
        name="templateId"
        value={selectedId}
        data-testid="product-template-input"
      />
      <p className="ac-form-field__label">{copy.templateSelectorEyebrow}</p>
      <h3 className="mt-1 text-lg font-bold text-[var(--text-primary)]">
        {copy.templateSelectorTitle}
      </h3>
      <p className="mt-1 text-xs leading-6 text-[var(--text-tertiary)]">
        {copy.templateSelectorDescription}
      </p>

      <div className="ac-template-catalog__grid mt-4">
        {PRODUCT_TEMPLATES.map((template) => {
          const isSelected = selectedId === template.id;
          const templateCopy = copy.productTemplates[template.nameKey];
          const Icon = TEMPLATE_ICONS[template.id];
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => setSelectedId(template.id)}
              className="ac-template-card group"
              data-selected={isSelected ? 'true' : 'false'}
              data-testid={`product-template-${template.id}`}
              aria-pressed={isSelected}
            >
              <div className="ac-template-card__body">
                <div className="flex items-start justify-between gap-3">
                  <Icon className="h-5 w-5 text-[var(--accent)]" />
                  {isSelected && <Check className="h-4 w-4 text-[var(--accent)]" />}
                </div>
                <h5 className="ac-template-card__title mt-3">{templateCopy.name}</h5>
                <p className="ac-template-card__summary">{templateCopy.description}</p>

                <div className="ac-template-card__footer">
                  <span className="ac-template-card__status">
                    {isSelected ? copy.templateSelectorSelected : copy.templateSelectorSelect}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
