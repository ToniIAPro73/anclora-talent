import { describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { buildKdpDisclosure } from './kdp-disclosure';
import type { AiOperationRecord } from './operations-log';

function operation(overrides: Partial<AiOperationRecord> = {}): AiOperationRecord {
  return {
    id: 'op-1',
    projectId: 'proj-1',
    userId: 'user-1',
    proposalId: 'ai-1',
    kind: 'style-rewrite',
    summary: 'Reescribir 2 párrafo(s)',
    mode: 'cloud',
    affectedBlockIds: ['p1'],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildKdpDisclosure', () => {
  test('100% human content → exempt declaration (ES)', () => {
    const disclosure = buildKdpDisclosure({
      provenance: { p1: 'human', p2: 'human' },
      operations: [],
      locale: 'es',
    });

    expect(disclosure.required).toBe(false);
    expect(disclosure.aiBlockCount).toBe(0);
    expect(disclosure.humanBlockCount).toBe(2);
    expect(disclosure.text).toContain('no requerida');
    expect(disclosure.text).toContain('autoría humana');
  });

  test('100% human content → exempt declaration (EN)', () => {
    const disclosure = buildKdpDisclosure({
      provenance: { p1: 'human' },
      operations: [],
      locale: 'en',
    });

    expect(disclosure.required).toBe(false);
    expect(disclosure.text).toContain('not required');
    expect(disclosure.text).toContain('human-authored');
  });

  test('ai blocks → required AI-assisted declaration with operations summary (ES)', () => {
    const disclosure = buildKdpDisclosure({
      provenance: { p1: 'ai', p2: 'human', s1: 'ai' },
      operations: [
        operation(),
        operation({ id: 'op-2', proposalId: 'ai-2', kind: 'style-rewrite' }),
        operation({ id: 'op-3', proposalId: 'ai-3', kind: 'derived-summary' }),
      ],
      locale: 'es',
    });

    expect(disclosure.required).toBe(true);
    expect(disclosure.aiBlockCount).toBe(2);
    expect(disclosure.text).toContain('asistencia de IA');
    expect(disclosure.text).toContain('2 bloque(s)');
    expect(disclosure.text).toContain('2 × reescritura de estilo');
    expect(disclosure.text).toContain('1 × capítulo de resumen derivado');
    expect(disclosure.text).toContain('aprobado explícitamente');
  });

  test('ai blocks → required declaration (EN)', () => {
    const disclosure = buildKdpDisclosure({
      provenance: { p1: 'ai' },
      operations: [operation({ kind: 'content-architecture' })],
      locale: 'en',
    });

    expect(disclosure.required).toBe(true);
    expect(disclosure.text).toContain('AI-assisted');
    expect(disclosure.text).toContain('1 × content restructure');
  });

  test('ai blocks without recorded operations still declare (legacy provenance)', () => {
    const disclosure = buildKdpDisclosure({
      provenance: { p1: 'ai' },
      operations: [],
      locale: 'es',
    });

    expect(disclosure.required).toBe(true);
    expect(disclosure.text).not.toContain('Operaciones de IA aceptadas');
  });

  test('null provenance → exempt', () => {
    const disclosure = buildKdpDisclosure({ provenance: null, operations: [], locale: 'es' });
    expect(disclosure.required).toBe(false);
  });
});
