'use server';

/**
 * Server actions — editor (corrector) suggestions (F4, entregable 2).
 *
 * Same governance as F3 AI proposals: the editor only PROPOSES
 * (`propose-suggestion`); only the author DECIDES (`decide-suggestion`).
 * Accepting applies the stored operations over a FRESH read of the document
 * and persists through the existing save route
 * (`projectRepository.saveDocumentExtras` — R3, no parallel write path),
 * stamping the touched blocks as `human` in the provenance map (the author
 * is the human who wrote the change into the document). A stale patch
 * (document edited meanwhile) is rejected and never writes.
 */

import { revalidatePath } from 'next/cache';
import { requireUserId } from '@/lib/auth/guards';
import { getDb, hasDatabase } from '@/lib/db';
import { projectRepository } from '@/lib/db/repositories';
import { projectToSemanticDocument } from '@/lib/compose/preview-adapter';
import { applyOperations, StaleProposalError } from '@/lib/ai/ast-diff-proposal';
import { deriveProvenanceUpdate } from '@/lib/ai/provenance';
import { canPerform } from './permissions';
import {
  findEditorSuggestion,
  insertEditorSuggestion,
  markSuggestionDecided,
  resolveProjectAccess,
} from './repository';
import { buildTextReplacementSuggestion, parseStoredOperations } from './suggestions';

type SuggestionError =
  | 'unavailable'
  | 'forbidden'
  | 'notFound'
  | 'invalid'
  /** The document changed since the editor proposed — the patch no longer applies. */
  | 'stale';

type Result<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; error: SuggestionError };

const MAX_SUMMARY_LENGTH = 500;

/**
 * Proposes a plain-text correction over one AST block (editor or author).
 * The server rebuilds the patch from the current document — the client only
 * sends the block id and the replacement text.
 */
export async function proposeEditorSuggestionAction(input: {
  projectId: string;
  blockId: string;
  replacementText: string;
  summary: string;
}): Promise<Result<{ suggestionId: string }>> {
  if (!hasDatabase()) return { ok: false, error: 'unavailable' };
  const userId = await requireUserId();
  if (!input.projectId) return { ok: false, error: 'notFound' };
  const access = await resolveProjectAccess(getDb(), { projectId: input.projectId, userId });
  if (!access) return { ok: false, error: 'notFound' };
  if (!canPerform(access.role, 'propose-suggestion')) return { ok: false, error: 'forbidden' };

  const summary = input.summary.trim();
  if (!summary || summary.length > MAX_SUMMARY_LENGTH) return { ok: false, error: 'invalid' };

  // Load the document as the owner (access already resolved the caller's
  // role): the project repository is owner-scoped by design.
  const project = await projectRepository.getProjectById(access.ownerId, input.projectId);
  if (!project) return { ok: false, error: 'notFound' };
  const { document } = projectToSemanticDocument(project);

  const built = buildTextReplacementSuggestion(document, {
    blockId: input.blockId,
    replacementText: input.replacementText,
  });
  if ('error' in built) {
    return { ok: false, error: built.error === 'blockNotFound' ? 'notFound' : 'invalid' };
  }

  const { id } = await insertEditorSuggestion(getDb(), {
    projectId: input.projectId,
    authorId: userId,
    summary,
    operations: built.operations,
    diff: built.diff,
  });

  revalidatePath(`/projects/${input.projectId}/editor`);
  return { ok: true, suggestionId: id };
}

/**
 * Author decision over a pending suggestion. `reject` only marks the
 * decision; `accept` applies the patch over a fresh document read (stale
 * patches never write) and persists through the regular save route.
 */
export async function decideEditorSuggestionAction(input: {
  projectId: string;
  suggestionId: string;
  decision: string;
}): Promise<Result> {
  if (!hasDatabase()) return { ok: false, error: 'unavailable' };
  const userId = await requireUserId();
  if (!input.projectId) return { ok: false, error: 'notFound' };
  const access = await resolveProjectAccess(getDb(), { projectId: input.projectId, userId });
  if (!access) return { ok: false, error: 'notFound' };
  if (!canPerform(access.role, 'decide-suggestion')) return { ok: false, error: 'forbidden' };

  const decision = input.decision === 'accept' || input.decision === 'reject' ? input.decision : null;
  if (!decision) return { ok: false, error: 'invalid' };

  const suggestion = await findEditorSuggestion(getDb(), {
    projectId: input.projectId,
    suggestionId: input.suggestionId,
  });
  if (!suggestion || suggestion.status !== 'pending') return { ok: false, error: 'notFound' };

  if (decision === 'reject') {
    await markSuggestionDecided(getDb(), {
      projectId: input.projectId,
      suggestionId: suggestion.id,
      status: 'rejected',
      decidedBy: userId,
    });
    revalidatePath(`/projects/${input.projectId}/editor`);
    return { ok: true };
  }

  const operations = parseStoredOperations(suggestion.operations);
  if (!operations) return { ok: false, error: 'invalid' };

  const project = await projectRepository.getProjectById(access.ownerId, input.projectId);
  if (!project) return { ok: false, error: 'notFound' };
  const { document } = projectToSemanticDocument(project);

  let edited;
  try {
    edited = { ...document, blocks: applyOperations(document.blocks, operations) };
  } catch (error) {
    if (error instanceof StaleProposalError) return { ok: false, error: 'stale' };
    throw error;
  }

  const provenance = deriveProvenanceUpdate(document, edited, project.document.provenance, 'human');
  await projectRepository.saveDocumentExtras(access.ownerId, input.projectId, {
    documentModel: edited,
    provenance,
  });

  await markSuggestionDecided(getDb(), {
    projectId: input.projectId,
    suggestionId: suggestion.id,
    status: 'accepted',
    decidedBy: userId,
  });

  revalidatePath(`/projects/${input.projectId}/editor`);
  revalidatePath(`/projects/${input.projectId}/preview`);
  return { ok: true };
}
