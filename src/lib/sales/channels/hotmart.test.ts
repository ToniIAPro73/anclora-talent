import { describe, expect, it } from 'vitest';
import type { LaunchKit } from '../launch-kit';
import { buildHotmartExportPackage } from './hotmart';

function kit(overrides: Partial<LaunchKit> = {}): LaunchKit {
  return {
    sheet: {
      title: 'Éxito sin compañía',
      subtitle: 'Guía práctica',
      longDescription: 'Descripción larga del libro.',
      descriptionSource: 'metadata',
      descriptionIsDraft: false,
      bullets: ['El diagnóstico', 'La reconstrucción'],
      author: 'Autora Ejemplo',
      isbn: '978-84-000',
      keywords: ['ensayo', 'relaciones'],
      language: 'es',
    },
    landing: {
      headline: 'Éxito sin compañía: Guía práctica',
      subheadline: 'El diagnóstico',
      benefitBullets: ['El diagnóstico', 'La reconstrucción'],
      cta: 'Consigue tu copia',
    },
    assets: [
      { kind: 'epub', url: 'https://blob/libro.epub' },
      { kind: 'pdf', url: 'https://blob/libro.pdf' },
    ],
    aiDisclosure: null,
    ...overrides,
  };
}

describe('buildHotmartExportPackage', () => {
  it('builds the manual-upload package: sheet + landing copy + structured JSON', () => {
    const pkg = buildHotmartExportPackage(kit());

    expect(pkg.channel).toBe('hotmart');
    expect(pkg.instructions.length).toBeGreaterThan(0);

    const names = pkg.files.map((file) => file.filename);
    expect(names).toEqual(['ficha-producto.md', 'copy-landing.md', 'producto.hotmart.json']);

    const sheet = pkg.files[0];
    expect(sheet.content).toContain('# Título: Éxito sin compañía');
    expect(sheet.content).toContain('**ISBN:** 978-84-000');
    expect(sheet.content).toContain('- El diagnóstico');
    expect(sheet.content).not.toContain('Borrador derivado');

    const landing = pkg.files[1];
    expect(landing.content).toContain('Éxito sin compañía: Guía práctica');
    expect(landing.content).toContain('**CTA:** Consigue tu copia');

    const structured = JSON.parse(pkg.files[2].content) as Record<string, unknown>;
    expect(structured).toMatchObject({
      channel: 'hotmart',
      format: 'ebook',
      title: 'Éxito sin compañía',
      isbn: '978-84-000',
      keywords: ['ensayo', 'relaciones'],
      descriptionIsDraft: false,
      assets: [
        { kind: 'epub', url: 'https://blob/libro.epub' },
        { kind: 'pdf', url: 'https://blob/libro.pdf' },
      ],
      aiDisclosure: null,
    });
  });

  it('flags the draft note when the description was derived', () => {
    const derived = kit();
    derived.sheet = { ...derived.sheet, descriptionSource: 'first-chapter', descriptionIsDraft: true };
    const pkg = buildHotmartExportPackage(derived);
    expect(pkg.files[0].content).toContain('Borrador derivado del primer capítulo');
  });

  it('includes the AI disclosure file only when the kit carries one', () => {
    const withDisclosure = buildHotmartExportPackage(kit({ aiDisclosure: 'Declaración KDP…' }));
    const names = withDisclosure.files.map((file) => file.filename);
    expect(names).toContain('disclosure-ia.txt');
    expect(withDisclosure.files.find((file) => file.filename === 'disclosure-ia.txt')?.content).toBe(
      'Declaración KDP…',
    );
    expect(kit().aiDisclosure).toBeNull();
    expect(buildHotmartExportPackage(kit()).files.map((file) => file.filename)).not.toContain(
      'disclosure-ia.txt',
    );
  });

  it('localizes the package in English for EN books', () => {
    const en = kit();
    en.sheet = { ...en.sheet, language: 'en' };
    const pkg = buildHotmartExportPackage(en);
    expect(pkg.files[0].content).toContain('# Title: Éxito sin compañía');
    expect(pkg.instructions[0]).toContain('Register product');
  });
});
