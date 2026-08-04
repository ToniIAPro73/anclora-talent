import { createHash } from 'node:crypto';
import type { SemanticDocument } from '@/lib/document/model';

/**
 * SHA-256 of the canonical document AST. Used as `sourceHash` in the asset
 * manifest: any content change (blocks or metadata) produces a new hash, so
 * previously generated assets are flagged stale at read time.
 */
export function hashDocumentAst(document: SemanticDocument): string {
  return createHash('sha256').update(JSON.stringify(document)).digest('hex');
}
