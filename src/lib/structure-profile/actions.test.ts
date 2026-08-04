/**
 * Structure profile CRUD + actions (FASE 3): governed extraction (preview
 * only, G2), confirmed persistence with per-name versioning and source
 * registration (G4), and explicit status transitions. Runs on the in-memory
 * repository path (no DATABASE_URL in tests).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/guards', () => ({ requireUserId: vi.fn(() => Promise.resolve('user_123')) }));

import {
  extractStructureProfileAction,
  saveStructureProfileAction,
  setStructureProfileStatusAction,
} from './actions';
import { structureProfileRepository } from './repository';
import type { InferredStructureSchema } from './model';

const FIXTURE_NAME = 'exito_sin_compania.docx';
const FIXTURE_PATH = resolve(process.cwd(), 'fixtures', FIXTURE_NAME);
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const MINIMAL_SCHEMA: InferredStructureSchema = {
  profileType: 'structure',
  hierarchy: {
    depth: 2,
    levels: ['parte', 'capitulo'],
    headingMap: { parte: 'H1', capitulo: 'H2' },
    maxObservedDepth: 2,
    regla: 'regla',
    confianza: 'verificado_en_fuente',
  },
  macroPattern: {
    nombre: null,
    numPartes: 1,
    secuencia: [{ parte: 'Parte única', funcionRetorica: null }],
    capitulosDeApertura: 0,
    capitulosPorParte: [1],
    regla: 'regla',
    confianza: 'inferido_de_un_documento',
  },
  chapterPattern: {
    apertura: { tipo: null, ejemplo: null, obligatorio: false, confianza: 'inferido_de_un_documento', nota: '' },
    cierre: { tipo: null, variantes: [], ejemplo: null, obligatorio: false, confianza: 'inferido_de_un_documento', nota: '' },
    subseccionesPorCapitulo: { promedio: 0, rangoObservado: [0, 0], distribucionReal: [], nota: '' },
  },
  enumerationStyle: null,
  tableUsage: {
    reglaActivacion: 'regla',
    ejemplo: null,
    prohibido: 'regla',
    tablasEnFuente: 0,
    confianza: 'verificado_en_fuente',
  },
  voiceScopeNote: 'nota',
  metrics: {
    totalHeadings: 2,
    desglose: { h1Partes: 1, h2Capitulos: 1, h3Subsecciones: 0 },
    tablas: 0,
    imagenes: 0,
  },
};

function referenceUploadFormData() {
  const file = new File([readFileSync(FIXTURE_PATH)], FIXTURE_NAME, { type: DOCX_MIME });
  const formData = new FormData();
  formData.set('referenceDocument', file);
  return formData;
}

function saveFormData(name: string, schema: unknown, sourceFileName = FIXTURE_NAME) {
  const formData = new FormData();
  formData.set('name', name);
  formData.set('schema', JSON.stringify(schema));
  formData.set('sourceFileName', sourceFileName);
  return formData;
}

describe('structure profile repository (CRUD, versionado G4)', () => {
  beforeEach(() => {
    globalThis.__ancloraStructureProfileStore?.clear();
  });

  test('creates, lists and fetches profiles scoped per user, with source registered', async () => {
    const created = await structureProfileRepository.createStructureProfile('user_123', {
      name: 'Ensayo técnico',
      schema: MINIMAL_SCHEMA,
      sourceFileName: FIXTURE_NAME,
    });

    expect(created.id).toBeTruthy();
    expect(created.version).toBe(1);
    expect(created.status).toBe('draft');
    expect(created.sourceFileName).toBe(FIXTURE_NAME);

    const mine = await structureProfileRepository.listStructureProfilesForUser('user_123');
    const others = await structureProfileRepository.listStructureProfilesForUser('user_999');
    expect(mine.map((profile) => profile.id)).toContain(created.id);
    expect(others).toHaveLength(0);

    const fetched = await structureProfileRepository.getStructureProfileById('user_123', created.id);
    expect(fetched?.schema.metrics.totalHeadings).toBe(2);
    expect(await structureProfileRepository.getStructureProfileById('user_999', created.id)).toBeNull();
  });

  test('activation deprecates other versions of the same name (single active)', async () => {
    const first = await structureProfileRepository.createStructureProfile('user_123', {
      name: 'Ensayo',
      version: 1,
      schema: MINIMAL_SCHEMA,
    });
    const second = await structureProfileRepository.createStructureProfile('user_123', {
      name: 'Ensayo',
      version: 2,
      schema: MINIMAL_SCHEMA,
    });

    await structureProfileRepository.setStructureProfileStatus('user_123', first.id, 'active');
    await structureProfileRepository.setStructureProfileStatus('user_123', second.id, 'active');

    expect(
      (await structureProfileRepository.getStructureProfileById('user_123', first.id))?.status,
    ).toBe('deprecated');
    expect(
      (await structureProfileRepository.getStructureProfileById('user_123', second.id))?.status,
    ).toBe('active');
  });
});

describe('structure profile actions (flujo gobernado)', () => {
  beforeEach(() => {
    globalThis.__ancloraStructureProfileStore?.clear();
  });

  test('extract infers the schema as a pure preview: nothing is persisted (G2)', async () => {
    const result = await extractStructureProfileAction(referenceUploadFormData());

    expect(result.ok).toBe(true);
    expect(result.sourceFileName).toBe(FIXTURE_NAME);
    expect(result.schema.metrics).toMatchObject({
      totalHeadings: 57,
      desglose: { h1Partes: 4, h2Capitulos: 12, h3Subsecciones: 41 },
      tablas: 14,
      imagenes: 3,
    });
    expect(result.schema.hierarchy.depth).toBe(3);

    // Governance: extraction alone never creates a profile.
    expect(await structureProfileRepository.listStructureProfilesForUser('user_123')).toHaveLength(0);
  });

  test('save persists the confirmed schema as active with source and auto-incremented version (G4)', async () => {
    const first = await saveStructureProfileAction(saveFormData('Ensayo', MINIMAL_SCHEMA));
    expect(first.version).toBe(1);

    const stored = await structureProfileRepository.getStructureProfileById('user_123', first.profileId);
    expect(stored?.status).toBe('active');
    expect(stored?.sourceFileName).toBe(FIXTURE_NAME);

    const second = await saveStructureProfileAction(saveFormData('Ensayo', MINIMAL_SCHEMA));
    expect(second.version).toBe(2);
    expect(
      (await structureProfileRepository.getStructureProfileById('user_123', first.profileId))?.status,
    ).toBe('deprecated');
    expect(
      (await structureProfileRepository.getStructureProfileById('user_123', second.profileId))?.status,
    ).toBe('active');
  });

  test('save rejects malformed payloads', async () => {
    await expect(saveStructureProfileAction(saveFormData('', MINIMAL_SCHEMA))).rejects.toThrow('name');
    await expect(saveStructureProfileAction(saveFormData('X', { not: 'a schema' }))).rejects.toThrow(
      'Invalid structure schema',
    );
    const badJson = new FormData();
    badJson.set('name', 'X');
    badJson.set('schema', '{nope');
    await expect(saveStructureProfileAction(badJson)).rejects.toThrow('Invalid schema JSON');
  });

  test('status transitions are explicit and scoped to the owner', async () => {
    const saved = await saveStructureProfileAction(saveFormData('Ensayo', MINIMAL_SCHEMA));

    const formData = new FormData();
    formData.set('profileId', saved.profileId);
    formData.set('status', 'deprecated');
    const result = await setStructureProfileStatusAction(formData);
    expect(result.status).toBe('deprecated');

    const invalid = new FormData();
    invalid.set('profileId', saved.profileId);
    invalid.set('status', 'archived');
    await expect(setStructureProfileStatusAction(invalid)).rejects.toThrow('Invalid');
  });
});
