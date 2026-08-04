'use server';

/**
 * AI server actions — Anclora Talent (F3).
 *
 * The only gateway between the UI and the governed-AI core. Every operation
 * is a proposal (diff over the AST) the human accepts or rejects:
 * - propose: rebuilds the SemanticDocument from the project and runs the
 *   structural assistant / coherence agent. The LLM path is only used when
 *   the cloud flag (OPENAI_API_KEY) is enabled, and the result always
 *   declares its processing mode (`mode`, transparency rule of F1b).
 * - accept: re-derives the document from a FRESH project load and applies
 *   the proposal through the pure core; a stale proposal (document edited
 *   meanwhile) is rejected and never writes. Persistence goes exclusively
 *   through the existing save route (`projectRepository.saveDocumentExtras`,
 *   the same one `saveProjectDocumentModelAction` uses — R3, no parallel
 *   write path), stamping the touched blocks as `ai` in the provenance map.
 * - reject: discards the proposal (no persistence; the registry of rejected
 *   proposals is optional and intentionally left out of this deliverable).
 */

import { revalidatePath } from 'next/cache';
import { requireUserId } from '@/lib/auth/guards';
import { projectRepository } from '@/lib/db/repositories';
import { projectToSemanticDocument } from '@/lib/compose/preview-adapter';
import type { ComposeViolation } from '@/lib/compose/compose';
import type { PreflightCheck } from '@/lib/preflight/preflight';
import { applyProposal, StaleProposalError, type AiProposal } from './ast-diff-proposal';
import { proposeCoherenceFixes, type CoherenceIssue } from './coherence-agent';
import { deriveProvenanceUpdate } from './provenance';
import { getAiProvider, isAiCloudEnabled } from './provider';
import { proposeStructuralFixes, type AiLocale, type AiProcessingMode } from './structural-assistant';

export interface ProposeFixActionResult {
  ok: boolean;
  mode: AiProcessingMode;
  /** Whether the cloud provider is configured (UI transparency copy). */
  cloudAvailable: boolean;
  proposals: AiProposal[];
}

export interface CoherenceActionResult extends ProposeFixActionResult {
  issues: CoherenceIssue[];
}

export interface AcceptProposalActionResult {
  ok: boolean;
  error?: 'stale' | 'invalid';
}

const FAILED_PROPOSE: ProposeFixActionResult = {
  ok: false,
  mode: 'local',
  cloudAvailable: false,
  proposals: [],
};

function parseLocale(value: FormDataEntryValue | null): AiLocale {
  return value === 'en' ? 'en' : 'es';
}

function parseJsonField<T>(formData: FormData, field: string): T | null {
  const raw = String(formData.get(field) ?? '').trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Generates fix proposals for one engine violation or one preflight check.
 * `payload` = `{ violation?: ComposeViolation; check?: PreflightCheck }`.
 */
export async function proposeViolationFixAction(formData: FormData): Promise<ProposeFixActionResult> {
  const userId = await requireUserId();
  const projectId = String(formData.get('projectId') ?? '').trim();
  const payload = parseJsonField<{ violation?: ComposeViolation; check?: PreflightCheck }>(formData, 'payload');
  if (!projectId || !payload || (!payload.violation && !payload.check)) return FAILED_PROPOSE;

  const project = await projectRepository.getProjectById(userId, projectId);
  if (!project) return FAILED_PROPOSE;

  const { document } = projectToSemanticDocument(project);
  const cloudAvailable = isAiCloudEnabled();
  const result = await proposeStructuralFixes(
    {
      document,
      violations: payload.violation ? [payload.violation] : [],
      checks: payload.check ? [payload.check] : [],
      locale: parseLocale(formData.get('locale')),
    },
    cloudAvailable ? getAiProvider() : undefined,
  );

  return { ok: true, mode: result.mode, cloudAvailable, proposals: result.proposals };
}

/** Runs the refs/TOC coherence agent over the whole document. */
export async function analyzeCoherenceAction(formData: FormData): Promise<CoherenceActionResult> {
  const userId = await requireUserId();
  const projectId = String(formData.get('projectId') ?? '').trim();
  if (!projectId) return { ...FAILED_PROPOSE, issues: [] };

  const project = await projectRepository.getProjectById(userId, projectId);
  if (!project) return { ...FAILED_PROPOSE, issues: [] };

  const { document } = projectToSemanticDocument(project);
  const cloudAvailable = isAiCloudEnabled();
  const result = await proposeCoherenceFixes(document, {
    provider: cloudAvailable ? getAiProvider() : undefined,
    locale: parseLocale(formData.get('locale')),
  });

  return {
    ok: true,
    mode: result.mode,
    cloudAvailable,
    issues: result.issues,
    proposals: result.proposals,
  };
}

/**
 * Accepts a proposal: applies it over a fresh read of the document and
 * persists the edited model + provenance through the existing save route.
 * Returns `{ ok: false, error: 'stale' }` when the document changed since
 * the proposal was generated — a stale proposal never writes.
 */
export async function acceptAiProposalAction(formData: FormData): Promise<AcceptProposalActionResult> {
  const userId = await requireUserId();
  const projectId = String(formData.get('projectId') ?? '').trim();
  const proposal = parseJsonField<AiProposal>(formData, 'proposal');
  if (!projectId || !proposal || proposal.provenance !== 'ai') {
    return { ok: false, error: 'invalid' };
  }

  const project = await projectRepository.getProjectById(userId, projectId);
  if (!project) return { ok: false, error: 'invalid' };

  const { document } = projectToSemanticDocument(project);

  let edited;
  try {
    edited = applyProposal(document, proposal);
  } catch (error) {
    if (error instanceof StaleProposalError) return { ok: false, error: 'stale' };
    throw error;
  }

  const provenance = deriveProvenanceUpdate(document, edited, project.document.provenance, 'ai');
  await projectRepository.saveDocumentExtras(userId, projectId, {
    documentModel: edited,
    provenance,
  });

  revalidatePath(`/projects/${projectId}/editor`);
  revalidatePath(`/projects/${projectId}/preview`);
  return { ok: true };
}

/** Rejects a proposal: discards it without touching the document. */
export async function rejectAiProposalAction(formData: FormData): Promise<{ ok: true }> {
  await requireUserId();
  // Discard only — no write path, no registry in this deliverable.
  void String(formData.get('proposalId') ?? '');
  return { ok: true };
}
