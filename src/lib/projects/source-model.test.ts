import JSZip from 'jszip';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  detectSourceFormat,
  getSourceCapabilities,
  parseMarkdownSource,
  analyzeFootnoteIntegrity,
  parseOdtSource,
  parsePlainTextSource,
  sourceModelToHtml,
  summarizeSourceModel,
} from './source-model';
import { MARKDOWN_MATERIALIZED_PROFILE, type ImportPresentationMode } from './markdown-presentation';
import { buildImportedDocumentSeed } from './import-pipeline';
import { createProjectRecord } from './factories';
import { projectToSemanticDocument } from '@/lib/compose/preview-adapter';
import { blocksToHtml } from '@/lib/document/to-html';

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
    expect(model.capabilities.semanticInlineMarks).toBe(true);
    expect(model.capabilities.richTypography).toBe(false);
  });

  it('parses the real corpus with semantic footnotes and source links', () => {
    const input = readFileSync(resolve(process.cwd(), 'src/lib/test-fixtures/corpus/ANCLORA_TALENT_TEST_MANUSCRIPT.md'), 'utf8');
    const model = parseMarkdownSource(input);
    const stats = summarizeSourceModel(model);
    expect(stats.h1).toBeGreaterThan(0);
    expect(stats.h2).toBeGreaterThan(0);
    expect(stats.h3).toBeGreaterThan(0);
    expect(stats.h4).toBeGreaterThan(0);
    expect(stats.tables).toBe(1);
    expect(stats.footnotes).toBe(5);
    expect(stats.links).toBeGreaterThan(0);
    const definitions = model.blocks.filter((block) => block.type === 'footnote');
    const references = model.blocks.flatMap((block) => block.runs ?? [])
      .flatMap((run) => run.semanticMarks ?? [])
      .filter((mark) => mark.type === 'footnoteReference');
    expect(definitions).toHaveLength(5);
    expect(definitions.map((block) => block.identifier)).toEqual(['1', '2', '3', '4', '5']);
    expect(references).toHaveLength(5);
    expect(references.map((mark) => mark.identifier)).toEqual(['1', '2', '3', '4', '5']);
    expect(model.sourceMetadata.footnotes).toMatchObject({
      referenceIdentifiers: ['1', '2', '3', '4', '5'],
      definitionIdentifiers: ['1', '2', '3', '4', '5'],
      missingDefinitions: [],
      orphanDefinitions: [],
      duplicateDefinitions: [],
    });
    expect(model.blocks.some((block) => block.text?.includes('[^1]'))).toBe(false);
    const seed = buildImportedDocumentSeed({
      fileName: 'ANCLORA_TALENT_TEST_MANUSCRIPT.md',
      mimeType: 'text/markdown',
      text: input,
    });
    const chapterTitles = (seed.chapters ?? []).map((chapter) => chapter.title.trim().toLowerCase());
    expect(new Set(chapterTitles).size).toBe(chapterTitles.length);
    expect(chapterTitles.filter((title) => title === 'índice')).toHaveLength(1);
    const notes = seed.chapters?.find((chapter) => chapter.title === 'Notas');
    expect(notes?.blocks).toHaveLength(6);
    expect(notes?.blocks.slice(1).map((block) => block.content)).toEqual([
      '<p class="editorial-endnote-definition" data-footnote="true" data-footnote-id="1">Herbert A. Simon, “Designing Organizations for an Information-Rich World”, 1971. Simon formuló la relación entre abundancia de información y escasez de atención.</p>',
      '<p class="editorial-endnote-definition" data-footnote="true" data-footnote-id="2">Daniel Kahneman, Thinking, Fast and Slow, Farrar, Straus and Giroux, 2011.</p>',
      '<p class="editorial-endnote-definition" data-footnote="true" data-footnote-id="3">Gloria Mark, Attention Span: A Groundbreaking Way to Restore Balance, Happiness and Productivity, Hanover Square Press, 2023.</p>',
      '<p class="editorial-endnote-definition" data-footnote="true" data-footnote-id="4">Cal Newport, Deep Work: Rules for Focused Success in a Distracted World, Grand Central Publishing, 2016.</p>',
      '<p class="editorial-endnote-definition" data-footnote="true" data-footnote-id="5">James Clear, Atomic Habits, Avery, 2018.</p>',
    ]);
  });

  it('reports malformed footnote relationships without discarding source blocks', () => {
    const model = parseMarkdownSource('Body.[^1]\n\n[^2]: Orphan.\n\n[^2]: Duplicate.');
    expect(analyzeFootnoteIntegrity(model.blocks, 'Body.[^1]\n\n[^2]: Orphan.\n\n[^2]: Duplicate.')).toMatchObject({
      referenceIdentifiers: ['1'],
      definitionIdentifiers: ['2'],
      missingDefinitions: ['1'],
      orphanDefinitions: ['2'],
      duplicateDefinitions: ['2'],
    });
    expect(model.blocks.filter((block) => block.type === 'footnote')).toHaveLength(2);
  });

  it('keeps footnote references rendered semantically through editor and preview projection', () => {
    const sourceModel = parseMarkdownSource('Texto con nota.[^1]\n\n## Notas\n\n[^1]: Contenido de la nota.');
    const seed = buildImportedDocumentSeed({
      fileName: 'notas.md',
      mimeType: 'text/markdown',
      text: 'Texto con nota.[^1]\n\n## Notas\n\n[^1]: Contenido de la nota.',
      sourceModel,
    });
    const project = createProjectRecord('user-1', { title: 'Notas', importedDocument: seed });
    const { document } = projectToSemanticDocument(project);
    const body = document.blocks.find((block) =>
      block.type === 'paragraph' && block.content.some((node) => node.type === 'footnoteReference'),
    );
    const html = blocksToHtml(document.blocks);

    expect(body).toBeDefined();
    expect(html).toContain('<sup data-footnote-reference="1">1</sup>');
    expect(html).toContain('class="editorial-endnote-definition"');
    expect(html).toContain('data-footnote-id="1"');
    expect(html).toContain('Contenido de la nota.');
  });

  it('keeps Mode A and Mode B semantically identical while changing only presentation metadata', () => {
    const text = '# H1\n\n## H2\n\nBody with **strong**, *emphasis*, [link](https://example.com) and a note.[^1]\n\n- one\n- two\n\n## Notas\n\n[^1]: note';
    const sourceModel = parseMarkdownSource(text);
    const makeSeed = (mode: ImportPresentationMode) => buildImportedDocumentSeed({
      fileName: 'sample.md',
      mimeType: 'text/markdown',
      text,
      sourceModel,
      importPresentationMode: mode,
      presentationProvenance: mode === 'materialized' ? 'TALENT_MATERIALIZED' : 'TALENT_DEFAULT',
      presentationProfileId: mode === 'materialized' ? MARKDOWN_MATERIALIZED_PROFILE.id : undefined,
    });
    const a = makeSeed('source-semantic');
    const b = makeSeed('materialized');
    expect(a.sourceModel?.blocks).toEqual(b.sourceModel?.blocks);
    expect(a.chapters).toEqual(b.chapters);
    expect(a.chapters?.find((chapter) => chapter.title === 'Notas')?.blocks).toHaveLength(2);
    expect(a.importPresentationMode).toBe('source-semantic');
    expect(b.importPresentationMode).toBe('materialized');
    expect(b.presentationProvenance).toBe('TALENT_MATERIALIZED');
  });

  it('persists the Markdown mode and provenance through project creation', () => {
    const seed = buildImportedDocumentSeed({
      fileName: 'sample.md',
      mimeType: 'text/markdown',
      text: '# H1\n\nBody',
      importPresentationMode: 'materialized',
      presentationProvenance: 'TALENT_MATERIALIZED',
      presentationProfileId: MARKDOWN_MATERIALIZED_PROFILE.id,
    });
    const project = createProjectRecord('user-1', { title: 'Sample', importedDocument: seed });
    expect(project.document.source?.importPresentationMode).toBe('materialized');
    expect(project.document.metadata?.importPresentationMode).toBe('materialized');
    expect(project.document.metadata?.presentationProvenance).toBe('TALENT_MATERIALIZED');
    expect(project.document.metadata?.presentationProfileId).toBe(MARKDOWN_MATERIALIZED_PROFILE.id);
  });

  it('projects Markdown into rendered editor HTML without leaking source syntax', () => {
    const seed = buildImportedDocumentSeed({
      fileName: 'sample.md',
      mimeType: 'text/markdown',
      text: '# Heading\n\nBody with **strong** and *emphasis*.\n\n> Quote\n\n- One\n- Two',
    });
    const contents = (seed.chapters ?? []).flatMap((chapter) => chapter.blocks.map((block) => block.content));
    expect(contents.join('\n')).not.toContain('## ');
    expect(contents.join('\n')).not.toContain('**strong**');
    expect(contents.join('\n')).toContain('<strong>strong</strong>');
    expect(contents.join('\n')).toContain('<blockquote>');
    expect(contents.join('\n')).toContain('<ul>');
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
    zip.file('content.xml', '<office:document-content xmlns:office="urn:o" xmlns:text="urn:t"><office:body><office:text><text:h text:outline-level="1">Title</text:h><text:p text:style-name="Body">Body <text:span text:style-name="Emphasis">text</text:span>.</text:p></office:text></office:body></office:document-content>');
    zip.file('styles.xml', '<office:document-styles xmlns:office="urn:o" />');
    const model = await parseOdtSource(await zip.generateAsync({ type: 'uint8array' }));
    expect(model.format).toBe('odt');
    expect(model.family).toBe('rich');
    expect(model.blocks.map((block) => block.type)).toEqual(['heading', 'paragraph']);
    expect(model.blocks[1].runs?.some((run) => run.sourceStyleId === 'Emphasis')).toBe(true);
  });

  it('reports ODT presentation only when styles.xml actually provides it', async () => {
    const zip = new JSZip();
    zip.file('content.xml', '<office:document-content xmlns:office="urn:o" xmlns:text="urn:t"><office:body><office:text><text:p>Body</text:p></office:text></office:body></office:document-content>');
    zip.file('styles.xml', '<office:document-styles xmlns:office="urn:o" xmlns:style="urn:s" xmlns:fo="urn:f"><style:style style:name="Standard"><style:paragraph-properties fo:line-height="122%"/><style:text-properties fo:font-family="&apos;Liberation Serif&apos;, &apos;Times New Roman&apos;" fo:font-size="11.5pt"/></style:style></office:document-styles>');
    const model = await parseOdtSource(await zip.generateAsync({ type: 'uint8array' }));
    expect(model.sourceMetadata.presentationProfile).toMatchObject({
      status: 'extracted',
      fontFamily: 'Liberation Serif',
      fontSizePt: 11.5,
      lineHeight: 1.22,
      provenance: 'SOURCE_STYLE',
    });
  });

  it('parses ODT inline nodes without leaking XML and preserves whitespace semantics', async () => {
    const zip = new JSZip();
    zip.file('content.xml', '<office:document-content xmlns:office="urn:o" xmlns:text="urn:t"><office:body><office:text><text:p>Uno<text:s text:c="2"/><text:tab/>Dos<text:line-break/>Tres<text:span text:style-name="T4"> fuerte</text:span><text:a xlink:href="https://example.com" xmlns:xlink="http://www.w3.org/1999/xlink"> enlace</text:a></text:p></office:text></office:body></office:document-content>');
    const model = await parseOdtSource(await zip.generateAsync({ type: 'uint8array' }));
    const paragraph = model.blocks[0];
    expect(paragraph.text).toBe('Uno  \tDos\nTres fuerte enlace');
    expect(sourceModelToHtml(model)).not.toMatch(/(?:text:span|text:style-name|office:|fo:|draw:|xlink:)/);
    expect(sourceModelToHtml(model)).toContain('Dos<br />Tres');
  });

  it('keeps embedded ODT images when the frame is wrapped by an empty paragraph', async () => {
    const zip = new JSZip();
    zip.file('content.xml', '<office:document-content xmlns:office="urn:o" xmlns:text="urn:t" xmlns:draw="urn:d" xmlns:xlink="http://www.w3.org/1999/xlink"><office:body><office:text><text:p><draw:frame draw:name="Figure 1"><draw:image xlink:href="Pictures/figure.png" /></draw:frame></text:p><text:p>Caption</text:p></office:text></office:body></office:document-content>');
    zip.file('styles.xml', '<office:document-styles xmlns:office="urn:o" />');
    zip.file('Pictures/figure.png', Uint8Array.from([137, 80, 78, 71]));
    const model = await parseOdtSource(await zip.generateAsync({ type: 'uint8array' }));
    expect(model.blocks.map((block) => block.type)).toEqual(['image', 'paragraph']);
    expect(model.blocks[0].src).toMatch(/^data:image\/png;base64,/);
    expect(sourceModelToHtml(model)).toContain('<img src="data:image/png;base64,');
  });

  it('keeps effective ODT typography and paragraph properties in project chapters', async () => {
    const zip = new JSZip();
    zip.file('content.xml', '<office:document-content xmlns:office="urn:o" xmlns:text="urn:t" xmlns:style="urn:s" xmlns:fo="urn:f"><office:body><office:text><text:h text:outline-level="1" text:style-name="H1">Heading</text:h><text:p text:style-name="Body">Body <text:span text:style-name="Emphasis">emphasis</text:span></text:p></office:text></office:body></office:document-content>');
    zip.file('styles.xml', '<office:document-styles xmlns:office="urn:o" xmlns:style="urn:s" xmlns:fo="urn:f"><style:style style:name="Standard" style:family="paragraph"><style:text-properties fo:font-family="Liberation Serif" fo:font-size="11.5pt"/></style:style><style:style style:name="Body" style:family="paragraph" style:parent-style-name="Standard"><style:paragraph-properties fo:text-align="justify"/></style:style><style:style style:name="H1" style:family="paragraph"><style:text-properties fo:font-family="Calibri" fo:font-size="24pt" fo:font-weight="bold"/></style:style><style:style style:name="Emphasis" style:family="text"><style:text-properties fo:font-family="Liberation Sans" fo:font-size="12.5pt" fo:font-style="italic"/></style:style></office:document-styles>');
    const model = await parseOdtSource(await zip.generateAsync({ type: 'uint8array' }));
    const html = sourceModelToHtml(model);
    const seed = buildImportedDocumentSeed({
      fileName: 'fidelity.odt',
      mimeType: 'application/vnd.oasis.opendocument.text',
      text: model.blocks.map((block) => block.text ?? '').join('\n\n'),
      html,
      sourceModel: model,
    });
    const contents = (seed.chapters ?? []).flatMap((chapter) => chapter.blocks.map((block) => block.content)).join('\n');
    expect(contents).toContain('font-family:Calibri;font-size:24pt');
    expect(contents).toContain('font-family:Liberation Serif;font-size:11.5pt');
    expect(contents).toContain('font-family:Liberation Sans;font-size:12.5pt');
    expect(contents).toContain('font-style:italic');
    expect(contents).toContain('text-align:justify');
    expect(contents).toContain('data-source-style-id="H1"');
  });

  it('keeps ODT source and chapter HTML after project persistence round-trip', async () => {
    const zip = new JSZip();
    zip.file('content.xml', '<office:document-content xmlns:office="urn:o" xmlns:text="urn:t" xmlns:style="urn:s" xmlns:fo="urn:f"><office:body><office:text><text:h text:outline-level="1" text:style-name="H1">Chapter</text:h><text:p text:style-name="Body">Body</text:p></office:text></office:body></office:document-content>');
    zip.file('styles.xml', '<office:document-styles xmlns:office="urn:o" xmlns:style="urn:s" xmlns:fo="urn:f"><style:style style:name="Body" style:family="paragraph"><style:text-properties fo:font-family="Liberation Serif" fo:font-size="11.5pt"/></style:style><style:style style:name="H1" style:family="paragraph"><style:text-properties fo:font-family="Calibri" fo:font-size="24pt"/></style:style></office:document-styles>');
    const sourceModel = await parseOdtSource(await zip.generateAsync({ type: 'uint8array' }));
    const seed = buildImportedDocumentSeed({
      fileName: 'round-trip.odt',
      mimeType: 'application/vnd.oasis.opendocument.text',
      text: sourceModel.blocks.map((block) => block.text ?? '').join('\n\n'),
      html: sourceModelToHtml(sourceModel),
      sourceModel,
    });
    const project = createProjectRecord('qa-user', { title: 'Round trip', importedDocument: seed });
    const reloaded = JSON.parse(JSON.stringify(project)) as typeof project;
    expect(reloaded.document.metadata?.sourceModel?.format).toBe('odt');
    expect(reloaded.document.metadata?.sourceModel?.blocks[0].runs?.[0].directFormatting).toMatchObject({ fontFamily: 'Calibri', fontSizePt: 24 });
    expect(reloaded.document.chapters.flatMap((chapter) => chapter.blocks.map((block) => block.content)).join('\n')).toContain('font-size:24pt');
  });
});
