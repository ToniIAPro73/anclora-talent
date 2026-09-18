'use client';

import { BookOpen, CheckCircle2, FileText, History, LayoutGrid, Palette } from 'lucide-react';
import type { AppMessages } from '@/lib/i18n/messages';

export type ContentTabId = 'resumen' | 'metadatos' | 'composicion' | 'marca' | 'preflight' | 'versiones';

type Copy = AppMessages['project'];

const TAB_ICONS: Record<ContentTabId, React.ComponentType<{ className?: string }>> = {
  resumen: LayoutGrid,
  metadatos: FileText,
  composicion: BookOpen,
  marca: Palette,
  preflight: CheckCircle2,
  versiones: History,
};

export function contentTabLabels(copy: Copy): Record<ContentTabId, string> {
  return {
    resumen: copy.contentTabResumen,
    metadatos: copy.contentTabMetadatos,
    composicion: copy.contentTabComposicion,
    marca: copy.contentTabMarca,
    preflight: copy.contentTabPreflight,
    versiones: copy.contentTabVersiones,
  };
}

export function ContentTabs({
  copy,
  activeTab,
  onChange,
}: {
  copy: Copy;
  activeTab: ContentTabId;
  onChange: (tab: ContentTabId) => void;
}) {
  const labels = contentTabLabels(copy);
  const tabs: ContentTabId[] = ['resumen', 'metadatos', 'composicion', 'marca', 'preflight', 'versiones'];

  return (
    <nav className="ac-tabs talent-content-tabs" aria-label={copy.contentTabResumen} data-testid="content-tabs">
      <div className="ac-tabs__list" role="tablist">
        {tabs.map((tab) => {
          const Icon = TAB_ICONS[tab];
          const selected = tab === activeTab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-current={selected ? 'page' : undefined}
              data-testid={`content-tab-${tab}`}
              onClick={() => onChange(tab)}
              className="ac-tabs__tab"
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="ml-1.5">{labels[tab]}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
