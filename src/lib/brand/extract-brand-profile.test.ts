/**
 * Deterministic contract (FASE 2): the brand extractor over the real fixture
 * (`fixtures/anclora_insights_manual_identidad.pdf` — Manual de Identidad
 * Anclora Insights v3.0) must produce the declared theme pack: the four hex
 * colors in their roles, Libre Baskerville as display voice, Inter as body
 * voice and the 55/30/10/5 usage proportion.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  extractBrandProfileFromPdf,
  extractBrandProfileFromText,
} from './extract-brand-profile';

const FIXTURE_PATH = resolve(
  process.cwd(),
  'fixtures',
  'anclora_insights_manual_identidad.pdf',
);

async function extractFixture() {
  return extractBrandProfileFromPdf(
    readFileSync(FIXTURE_PATH),
    'anclora_insights_manual_identidad.pdf',
  );
}

describe('brand extraction contract (fixture manual v3.0)', () => {
  it('extracts the four palette hexes in their declared roles with high confidence', async () => {
    const { profile } = await extractFixture();

    expect(profile.palette).toEqual([
      { role: 'ink', hex: '#0F172A', name: 'Negro Tinta', usagePercent: 55, confidence: 'high' },
      { role: 'paper', hex: '#F8FAFC', name: 'Crema Papel', usagePercent: 30, confidence: 'high' },
      { role: 'accent', hex: '#F59E0B', name: 'Oro Metálico', usagePercent: 10, confidence: 'high' },
      { role: 'accentMuted', hex: '#D97706', name: 'Oro Mitigado', usagePercent: 5, confidence: 'high' },
    ]);
    // First real PDF parse of the run pays pdfjs-dist's cold-start cost (~7s
    // here); default 5s test timeout isn't enough for the actual work done.
  }, 15_000);

  it('extracts the typographic pair: Libre Baskerville display, Inter body', async () => {
    const { profile } = await extractFixture();

    expect(profile.typography.display).toEqual({ family: 'Libre Baskerville', confidence: 'high' });
    expect(profile.typography.body).toEqual({ family: 'Inter', confidence: 'high' });
  });

  it('extracts the 55/30/10/5 usage proportion', async () => {
    const { profile } = await extractFixture();

    expect(profile.usageProportions).toEqual({ ink: 55, paper: 30, accent: 10, accentMuted: 5 });
  });

  it('captures governance rules and voice contrast pairs (F3 few-shot material)', async () => {
    const { profile } = await extractFixture();

    expect(profile.governanceRules).toContain(
      'Nunca se intercambian los papeles; nunca entra una tercera familia.',
    );
    expect(profile.governanceRules).toContain('No se introducen terceras familias.');
    const pairs = profile.voicePairs ?? [];
    expect(pairs.length).toBeGreaterThanOrEqual(2);
    expect(pairs[0].soundsLike).toContain('La evidencia sugiere');
    expect(pairs[0].doesntSoundLike).toContain('Descubre los 10 secretos');
  });

  it('is deterministic: two runs over the fixture produce identical drafts', async () => {
    const [first, second] = await Promise.all([extractFixture(), extractFixture()]);

    expect(first).toEqual(second);
  });
});

describe('brand extraction heuristics (synthetic text)', () => {
  it('assigns roles by appearance order with low confidence when no keywords match', () => {
    const { profile, warnings } = extractBrandProfileFromText(
      ['Valores', '#112233', '#AABBCC', '#445566'].join('\n'),
    );

    expect(profile.palette.map((color) => [color.role, color.hex, color.confidence])).toEqual([
      ['ink', '#112233', 'low'],
      ['paper', '#AABBCC', 'low'],
      ['accent', '#445566', 'low'],
    ]);
    expect(profile.usageProportions).toBeNull();
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('uses the governance fallback for the typographic pair', () => {
    const { profile } = extractBrandProfileFromText(
      'Regla 05. Titulares en Playfair Display, cuerpo en Source Sans. Nunca mezclar.',
    );

    expect(profile.typography.display).toEqual({ family: 'Playfair Display', confidence: 'medium' });
    expect(profile.typography.body).toEqual({ family: 'Source Sans', confidence: 'medium' });
  });

  it('reads plain-text voice markers too', () => {
    const { profile } = extractBrandProfileFromText(
      'Así suena: «Frase serena.» Así no suena: «¡Frase histérica!»',
    );

    expect(profile.voicePairs).toEqual([
      { soundsLike: 'Frase serena.', doesntSoundLike: '¡Frase histérica!' },
    ]);
  });
});
