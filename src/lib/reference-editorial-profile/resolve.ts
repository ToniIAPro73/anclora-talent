import type { EditorialTextStyle, ReferenceEditorialProfile } from './model';

export type EditorialRole = 'body' | 'h1' | 'h2' | 'h3' | 'quote' | 'header' | 'footer';

/** Single role cascade used by preview/export adapters. Manual values win. */
export function resolveEditorialStyle(
  role: EditorialRole,
  manual: EditorialTextStyle | null | undefined,
  profile: ReferenceEditorialProfile | null | undefined,
  template: EditorialTextStyle | null | undefined,
  fallback: EditorialTextStyle,
): EditorialTextStyle {
  const reference = profile ? role === 'body' ? profile.body : role === 'h1' ? profile.headings.h1 : role === 'h2' ? profile.headings.h2 : role === 'h3' ? profile.headings.h3 : role === 'quote' ? profile.quote : role === 'header' ? profile.header.style : profile.footer.style : null;
  return { ...fallback, ...(template ?? {}), ...(reference ?? {}), ...(manual ?? {}) };
}
