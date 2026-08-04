import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import type { InferredStructureSchema, StructureProfile } from '@/lib/structure-profile/model';
import { StructureScaffoldingDialog } from './StructureScaffoldingDialog';

/**
 * Governed structure wizard tests (FASE 3, G2): the inferred schema is only
 * handed to the creation form after an explicit human confirmation; discard
 * produces nothing. Saved profiles also pass through the confirmation screen
 * (never a silent application).
 */

const extractStructureProfileAction = vi.fn();
const saveStructureProfileAction = vi.fn();

vi.mock('@/lib/structure-profile/actions', () => ({
  extractStructureProfileAction: (...args: unknown[]) => extractStructureProfileAction(...args),
  saveStructureProfileAction: (...args: unknown[]) => saveStructureProfileAction(...args),
}));

const copy = resolveLocaleMessages('es').project;

const SCHEMA: InferredStructureSchema = {
  profileType: 'structure',
  hierarchy: {
    depth: 3,
    levels: ['parte', 'capitulo', 'subseccion'],
    headingMap: { parte: 'H1', capitulo: 'H2', subseccion: 'H3' },
    maxObservedDepth: 3,
    regla: 'regla',
    confianza: 'verificado_en_fuente',
  },
  macroPattern: {
    nombre: null,
    numPartes: 2,
    secuencia: [
      { parte: 'El diagnóstico', funcionRetorica: 'identificar el problema y legitimarlo' },
      { parte: 'La reconstrucción', funcionRetorica: null },
    ],
    capitulosDeApertura: 0,
    capitulosPorParte: [1, 1],
    regla: 'regla',
    confianza: 'inferido_de_un_documento',
  },
  chapterPattern: {
    apertura: {
      tipo: 'pregunta_retorica_o_afirmacion_provocadora',
      ejemplo: '¿Por qué?',
      obligatorio: false,
      confianza: 'inferido_de_un_documento',
      nota: 'nota',
    },
    cierre: {
      tipo: null,
      variantes: [],
      ejemplo: null,
      obligatorio: false,
      confianza: 'inferido_de_un_documento',
      nota: 'nota',
    },
    subseccionesPorCapitulo: { promedio: 2, rangoObservado: [1, 3], distribucionReal: [1, 3], nota: '' },
  },
  enumerationStyle: null,
  tableUsage: {
    reglaActivacion: 'regla',
    ejemplo: null,
    prohibido: 'regla',
    tablasEnFuente: 2,
    confianza: 'verificado_en_fuente',
  },
  voiceScopeNote: 'Este perfil NO captura tono, léxico ni estilo de frase.',
  metrics: {
    totalHeadings: 8,
    desglose: { h1Partes: 2, h2Capitulos: 2, h3Subsecciones: 4 },
    tablas: 2,
    imagenes: 1,
  },
};

const SAVED_PROFILE: StructureProfile = {
  id: 'profile-1',
  userId: 'user_123',
  name: 'Ensayo de referencia',
  version: 3,
  status: 'active',
  schema: SCHEMA,
  sourceFileName: 'referencia.docx',
  createdAt: '2026-08-04T00:00:00.000Z',
  updatedAt: '2026-08-04T00:00:00.000Z',
};

function renderDialog(overrides: Partial<Parameters<typeof StructureScaffoldingDialog>[0]> = {}) {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  render(
    <StructureScaffoldingDialog
      isOpen
      profiles={[SAVED_PROFILE]}
      copy={copy}
      onConfirm={onConfirm}
      onClose={onClose}
      {...overrides}
    />,
  );
  return { onConfirm, onClose };
}

describe('StructureScaffoldingDialog (flujo gobernado G2)', () => {
  beforeEach(() => {
    extractStructureProfileAction.mockReset();
    saveStructureProfileAction.mockReset();
  });

  test('a saved profile also requires explicit confirmation; confirming hands the schema over', async () => {
    const { onConfirm } = renderDialog();

    fireEvent.change(screen.getByTestId('structure-profile-select'), {
      target: { value: SAVED_PROFILE.id },
    });

    // Confirmation screen with hierarchy, parts, functions and confidence.
    const screen1 = await screen.findByTestId('structure-confirm-screen');
    expect(screen1).toBeInTheDocument();
    expect(screen.getByTestId('structure-hierarchy-line')).toHaveTextContent(
      'parte → capitulo → subseccion',
    );
    expect(screen.getByTestId('structure-hierarchy-line')).toHaveTextContent(
      'confianza: verificado_en_fuente',
    );
    expect(screen.getByTestId('structure-summary-line')).toHaveTextContent(
      '2 partes · 2 capítulos · 4 subsecciones',
    );
    const parts = screen.getByTestId('structure-parts-list');
    expect(parts).toHaveTextContent('El diagnóstico — identificar el problema y legitimarlo');
    expect(parts).toHaveTextContent('La reconstrucción — sin inferir');

    fireEvent.click(screen.getByTestId('structure-confirm-button'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith(SCHEMA);
    expect(saveStructureProfileAction).not.toHaveBeenCalled();
  });

  test('discarding produces nothing: no schema is handed over and nothing is saved', async () => {
    const { onConfirm, onClose } = renderDialog();

    fireEvent.change(screen.getByTestId('structure-profile-select'), {
      target: { value: SAVED_PROFILE.id },
    });
    await screen.findByTestId('structure-confirm-screen');

    fireEvent.click(screen.getByTestId('structure-discard-button'));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(saveStructureProfileAction).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  test('uploading a reference document analyzes it and shows the confirmation screen', async () => {
    extractStructureProfileAction.mockResolvedValue({
      ok: true,
      schema: SCHEMA,
      sourceFileName: 'referencia.docx',
      suggestedName: 'referencia',
    });
    const { onConfirm } = renderDialog({ profiles: [] });

    const file = new File(['docx'], 'referencia.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    fireEvent.change(screen.getByTestId('structure-file-input'), {
      target: { files: [file] },
    });

    await waitFor(() => expect(extractStructureProfileAction).toHaveBeenCalledTimes(1));
    await screen.findByTestId('structure-confirm-screen');

    fireEvent.click(screen.getByTestId('structure-confirm-button'));
    expect(onConfirm).toHaveBeenCalledWith(SCHEMA);
  });

  test('optionally persists the confirmed schema as a reusable profile (G4)', async () => {
    saveStructureProfileAction.mockResolvedValue({ ok: true, profileId: 'p-2', version: 1 });
    const { onConfirm } = renderDialog();

    fireEvent.change(screen.getByTestId('structure-profile-select'), {
      target: { value: SAVED_PROFILE.id },
    });
    await screen.findByTestId('structure-confirm-screen');

    fireEvent.click(screen.getByTestId('structure-save-profile-checkbox'));
    fireEvent.change(screen.getByTestId('structure-profile-name-input'), {
      target: { value: 'Mi estructura' },
    });
    fireEvent.click(screen.getByTestId('structure-confirm-button'));

    await waitFor(() => expect(saveStructureProfileAction).toHaveBeenCalledTimes(1));
    const savedFormData = saveStructureProfileAction.mock.calls[0][0] as FormData;
    expect(savedFormData.get('name')).toBe('Mi estructura');
    expect(savedFormData.get('sourceFileName')).toBe('referencia.docx');
    expect(JSON.parse(String(savedFormData.get('schema')))).toEqual(SCHEMA);

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(SCHEMA));
  });

  test('nothing renders while closed', () => {
    renderDialog({ isOpen: false });
    expect(screen.queryByTestId('structure-dialog')).not.toBeInTheDocument();
  });
});
