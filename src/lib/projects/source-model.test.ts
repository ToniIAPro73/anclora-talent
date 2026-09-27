import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import {
  detectSourceFormat,
  getSourceCapabilities,
  parseMarkdownSource,
  parseOdtSource,
  parsePlainTextSource,
} from './source-model';

describe('source-aware import model', () => {
  it('dispatches active formats by extension and MIME without treating PDF as active', () => {
    expect(detectSourceFormat('manuscrito.odt', 'application/octet-stream')).toBe('odt');
    expect(detectSourceFormat('readme.md', 'text/plain')).toBe('markdown');
    expect(detectSourceFormat('notes.txt', 'text/plain')).toBe('txt');
    expect(getSourceCapabilities('markdown').richTypography).toBe(false);
    expect(getSourceCapabilities('markdown').runFormatting).toBe('semanticMarksOnly');
  });

  it('keeps Markdown semantics and local inline marks', () => {
    const model = parseMarkdownSource('# Title\n\nText with **strong** and *emphasis*.\n\n> quote\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n```ts\nconst value = 1;\n```');
    expect(model.family).toBe('semantic');
    expect(model.blocks.map((block) => block.type)).toEqual([
      'heading',
      'paragraph',
      'blockquote',
      'table',
      'codeBlock',
    ]);
    expect(model.blocks[1].runs?.[0].semanticMarks?.map((mark) => mark.type)).toEqual(['strong', 'emphasis']);
    expect(model.blocks[3].rows).toEqual([['A', 'B'], ['1', '2']]);
  });

  it('marks conservative TXT heading inference separately from source text', () => {
    const model = parsePlainTextSource('Capítulo 1\n\nTexto de cuerpo.');
    expect(model.family).toBe('plain');
    expect(model.blocks[0].type).toBe('heading');
    expect(model.blocks[0].provenance.kind).toBe('INFERRED');
    expect(model.blocks[1].provenance.kind).toBe('SOURCE_EXPLICIT');
    expect(model.sourceMetadata.presentation).toBe('none');
  });

  it('parses ODT content.xml as a rich source instead of plain text', async () => {
    const zip = new JSZip();
    zip.file('content.xml', '<office:document-content><office:body><office:text><text:h text:outline-level="1">Title</text:h><text:p text:style-name="Body">Body <text:span text:style-name="Emphasis">text</text:span>.</text:p></office:text></office:body></office:document-content>');
    zip.file('styles.xml', '<office:document-styles />');
    const model = await parseOdtSource(await zip.generateAsync({ type: 'uint8array' }));
    expect(model.format).toBe('odt');
    expect(model.family).toBe('rich');
    expect(model.blocks.map((block) => block.type)).toEqual(['heading', 'paragraph']);
    expect(model.blocks[1].runs?.some((run) => run.sourceStyleId === 'Emphasis')).toBe(true);
  });
});
