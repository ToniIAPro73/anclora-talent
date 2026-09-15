import { describe, expect, it } from 'vitest';
import type { DocumentBlock, SemanticDocument } from '@/lib/document/model';
import { buildLaunchKit } from './launch-kit';
import { assessLaunchKitQuality } from './launch-kit-quality';

function heading(level: 1 | 2 | 3, text: string): DocumentBlock {
  return { id: `h-${text}`, type: 'heading', level, content: [{ type: 'text', text }] };
}

function paragraph(text: string): DocumentBlock {
  return { id: `p-${text.slice(0, 12)}`, type: 'paragraph', content: [{ type: 'text', text }] };
}

function documentWith(blocks: DocumentBlock[], metadata?: Partial<SemanticDocument['metadata']>): SemanticDocument {
  return {
    version: 1,
    metadata: { title: 'Mi libro', language: 'es', ...metadata },
    blocks,
  };
}

describe('assessLaunchKitQuality', () => {
  it('rejects a title-only kit (no description, no chapter bullets)', () => {
    const kit = buildLaunchKit(documentWith([]));
    const quality = assessLaunchKitQuality(kit);

    expect(quality).toEqual({ sufficient: false, reason: 'insufficient-content' });
  });

  it('rejects a kit with no title at all', () => {
    const kit = buildLaunchKit(documentWith([], { title: '' }));
    const quality = assessLaunchKitQuality(kit);

    expect(quality).toEqual({ sufficient: false, reason: 'no-title' });
  });

  it('accepts a kit with an authored description', () => {
    const kit = buildLaunchKit(
      documentWith([], {
        description:
          'Una guía práctica para replantear la segunda mitad de la vida con propósito, foco y decisiones concretas. Sin relleno motivacional: pasos claros para diagnosticar tu situación y actuar.',
      }),
    );
    expect(assessLaunchKitQuality(kit)).toEqual({ sufficient: true });
  });

  it('accepts a kit with enough real chapter content (headings + derived description)', () => {
    const kit = buildLaunchKit(
      documentWith([
        heading(2, 'Diagnóstico honesto de dónde estás'),
        paragraph(
          'Antes de cualquier plan hace falta mirar de frente la situación actual: salud, finanzas, relaciones y propósito, sin adornos ni excusas.',
        ),
        heading(2, 'Diseña tu propio mapa'),
        heading(2, 'Convierte el plan en hábitos diarios'),
      ]),
    );
    expect(assessLaunchKitQuality(kit)).toEqual({ sufficient: true });
  });
});
