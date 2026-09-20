/**
 * Deterministic completeness score for the fields the product actually
 * supports (title/author/language required; ISBN/keywords/description
 * recommended). No field here is invented for the Metadatos redesign —
 * each one maps to a real DocumentMetadata/ProjectDocument field.
 */

export type MetadataFieldKey = 'title' | 'author' | 'language' | 'isbn' | 'keywords' | 'description';
export type MetadataFieldStatus = 'complete' | 'missing' | 'recommended';

export interface MetadataCompletenessField {
  key: MetadataFieldKey;
  status: MetadataFieldStatus;
}

export interface MetadataCompletenessInput {
  title: string;
  author: string;
  language: string;
  isbn?: string;
  keywords?: string[];
  description?: string;
}

export interface MetadataCompleteness {
  percent: number;
  fields: MetadataCompletenessField[];
  recommendationCount: number;
}

const REQUIRED_KEYS: MetadataFieldKey[] = ['title', 'author', 'language'];

export function computeMetadataCompleteness(input: MetadataCompletenessInput): MetadataCompleteness {
  const fields: MetadataCompletenessField[] = [
    field('title', input.title),
    field('author', input.author),
    field('language', input.language),
    field('isbn', input.isbn),
    field('keywords', (input.keywords ?? []).length > 0 ? 'x' : ''),
    field('description', input.description),
  ];

  const completeCount = fields.filter((f) => f.status === 'complete').length;
  const percent = Math.round((completeCount / fields.length) * 100);
  const recommendationCount = fields.filter((f) => f.status !== 'complete').length;

  return { percent, fields, recommendationCount };
}

function field(key: MetadataFieldKey, value: string | undefined): MetadataCompletenessField {
  const filled = Boolean(value?.trim());
  if (filled) return { key, status: 'complete' };
  return { key, status: REQUIRED_KEYS.includes(key) ? 'missing' : 'recommended' };
}
