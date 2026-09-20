import { describe, expect, test } from 'vitest';
import { computeMetadataCompleteness } from './metadata-completeness';

describe('computeMetadataCompleteness', () => {
  test('all fields filled: 100%, no recommendations', () => {
    const result = computeMetadataCompleteness({
      title: 'El mapa de las formas',
      author: 'María Vega',
      language: 'es',
      isbn: '978-84-00-00000-0',
      keywords: ['aprendizaje', 'cambio'],
      description: 'Un ensayo sobre los comienzos.',
    });

    expect(result.percent).toBe(100);
    expect(result.recommendationCount).toBe(0);
    expect(result.fields.every((f) => f.status === 'complete')).toBe(true);
  });

  test('missing required fields are flagged "missing", not "recommended"', () => {
    const result = computeMetadataCompleteness({ title: '', author: '', language: '' });

    const required = result.fields.filter((f) => ['title', 'author', 'language'].includes(f.key));
    expect(required.every((f) => f.status === 'missing')).toBe(true);
  });

  test('empty optional fields are flagged "recommended", not "missing"', () => {
    const result = computeMetadataCompleteness({ title: 'T', author: 'A', language: 'es' });

    const optional = result.fields.filter((f) => ['isbn', 'keywords', 'description'].includes(f.key));
    expect(optional.every((f) => f.status === 'recommended')).toBe(true);
    expect(result.percent).toBe(50); // 3 of 6 fields complete
  });

  test('whitespace-only values do not count as filled', () => {
    const result = computeMetadataCompleteness({ title: '   ', author: 'A', language: 'es' });
    const titleField = result.fields.find((f) => f.key === 'title');
    expect(titleField?.status).toBe('missing');
  });

  test('empty keywords array counts as not filled', () => {
    const result = computeMetadataCompleteness({ title: 'T', author: 'A', language: 'es', keywords: [] });
    const keywordsField = result.fields.find((f) => f.key === 'keywords');
    expect(keywordsField?.status).toBe('recommended');
  });

  test('recommendationCount matches the number of non-complete fields', () => {
    const result = computeMetadataCompleteness({ title: 'T', author: '', language: 'es', isbn: '123' });
    const nonComplete = result.fields.filter((f) => f.status !== 'complete').length;
    expect(result.recommendationCount).toBe(nonComplete);
  });
});
