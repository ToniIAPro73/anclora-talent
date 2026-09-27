import type { CompositionSettings } from './composition';

export type ImportPresentationMode = 'source-semantic' | 'materialized';
export type PresentationProvenance = 'TALENT_DEFAULT' | 'TALENT_MATERIALIZED' | 'USER_OVERRIDE' | 'REFERENCE';

export interface MarkdownPresentationProfile {
  id: 'talent-editorial-markdown-v1';
  label: string;
  settings: CompositionSettings;
  provenance: 'TALENT_MATERIALIZED';
}

/** One centrally testable preset for Mode B; source Markdown never owns these values. */
export const MARKDOWN_MATERIALIZED_PROFILE: MarkdownPresentationProfile = {
  id: 'talent-editorial-markdown-v1',
  label: 'Anclora Talent editorial',
  settings: {
    fontFamily: 'EB Garamond',
    fontSizePt: 11.5,
    lineHeight: 1.5,
    margins: { top: 28, bottom: 28, left: 30, right: 30 },
  },
  provenance: 'TALENT_MATERIALIZED',
};

export function isMarkdownPresentationMode(value: unknown): value is ImportPresentationMode {
  return value === 'source-semantic' || value === 'materialized';
}

export function materializedMarkdownComposition(): CompositionSettings {
  return {
    ...MARKDOWN_MATERIALIZED_PROFILE.settings,
    margins: MARKDOWN_MATERIALIZED_PROFILE.settings.margins
      ? { ...MARKDOWN_MATERIALIZED_PROFILE.settings.margins }
      : undefined,
  };
}

