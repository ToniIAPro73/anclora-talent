import 'server-only';
export { supportedImportAccept } from './import-config';
import { buildImportedDocumentSeed, extractTextFromBuffer, normalizeText } from './import-pipeline';

export { buildImportedDocumentSeed } from './import-pipeline';

export async function extractImportedDocumentSeed(file: File) {
  const fileName = file.name || 'documento-importado';
  const mimeType = file.type || 'application/octet-stream';
  const arrayBuffer = await file.arrayBuffer();
  const extractedSource = await extractTextFromBuffer(fileName, mimeType, Buffer.from(arrayBuffer));
  const normalized = normalizeText(extractedSource.text);

  if (!normalized) {
    throw new Error('Imported document is empty');
  }

  return buildImportedDocumentSeed({
    fileName,
    mimeType,
    text: normalized,
    html: extractedSource.html,
  });
}
