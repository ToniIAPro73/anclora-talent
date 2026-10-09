# AI Assistant Workspace v2 — Specification v1

## Scope

Replace Step 7 (`Asistente IA`) — today a **mock** (`AIAssistant.tsx`: hard-coded
suggestions, a fake "Iniciar Análisis IA" timer and an inert chat button) — with a governed
editorial AI workspace following `docs/mockups/workspace-system-v1/12-ai-assistant-v1.png`
(left manuscript/chapters, centre work area, right editorial actions + context), adapted to
the product contract: task-oriented, proposal-first, never chat-first.

The real co-author feature lives today in Step 1 (`CoAuthorPanel` inside `ContentWorkspace`);
Step 7 becomes its home and the duplicate in Step 1 is removed.

## Governance (unchanged)

`AI proposal != document mutation`. Every document-changing operation is
`analysis → AiProposal (BlockOperation[] over the AST) → human review → accept/reject →
server-side application (acceptAiProposalAction, fresh read, stale check, provenance `ai`) →
audit (aiOperationsLog, KDP disclosure)`. No effect applies a proposal; no client mutates the
document; no fake local responses; the processing mode is always shown.

## Audit matrix

| Feature | Current | Mockup | Decision |
| --- | --- | --- | --- |
| Step 7 screen | mock cards + fake timer + legacy rail | chat + actions + context | REMOVE mock, workspace shell without rail |
| Style / Architecture / Summary | real, in Step 1 `CoAuthorPanel` | "Mejorar pasaje / Resumir" | MOVE to Step 7 as editorial task cards (ids `style`/`architecture`/`summary` unchanged) |
| Chapter target | `<select>` (level-1 slices) | chapter list | REFINE: chapter list + "Documento completo" for doc-wide tasks |
| Proposal review | `AiProposalCard` flat list | inline suggestion | REFINE: one `AiProposalReview` (impact summary, grouped collapsible diff, text labels); `AiProposalCard` becomes a thin wrapper so Step 1 health panels share it |
| Coherence | real (`analyzeCoherenceAction`, refs/headings, deterministic, works without cloud) | "Revisar coherencia" | EXPOSE (declared as local analysis) |
| Document problems | real (`proposeViolationFixAction`, rules `widowsOrphans`, `keepTogether*`, heading jump) | — | EXPOSE as "Resolver problemas detectados" |
| Stale proposal | text only | — | MISSING → stale state with Regenerar / Descartar, no write |
| Processing mode | badge | — | KEEP + context row; never claim local when cloud |
| Provider missing | panel hidden (blank step) | — | MISSING → "Asistente IA no disponible" (cloud tasks off, coherence stays) |
| History | accepted ops in `activity_log` (KDP source) | "Sugerencias recientes" | EXPOSE as `Historial IA` (accepted operations only; rejections are not recorded) |
| Free chat / prompt box | none | primary | OMITTED (no supported engine; not faked) |
| "Cambiar tono", "SEO", "Títulos alternativos", scores | none | some | OMITTED (no real operation) |
| Fixed PDF | AST unavailable | — | tasks disabled with "Esta operación requiere un documento editable." |

## Acceptance criteria

1. Step 7 has no legacy rail; header/stepper kept; full-width three-column workspace.
2. Right "Acciones editoriales": Escritura (Mejorar estilo, Reorganizar capítulo), Documento
   (Crear resumen, Revisar coherencia), Correcciones (Resolver problemas detectados); only real
   operations. Selecting a task shows its description and target, never runs it by itself.
3. Left: manuscript summary + chapter list (+ "Documento completo"); chapter tasks use the
   chapter key of `listCoAuthorChapters`; document tasks ignore it.
4. Centre states: idle (capability cards), running (indeterminate, target, cloud indicator),
   proposal review, coherence issues, fix candidates, empty, error, unavailable, stale.
5. Proposal review: header (type, target, mode, affected blocks), impact summary derived from
   the diff counts, changes grouped by chapter then kind (collapsible), Antes/Después,
   Añadido/Eliminado/Modificado/Movido as text labels, `Aceptar cambios` / `Rechazar`, pending
   state disables both, stale → `Regenerar propuesta` / `Descartar` and never writes.
6. Accept → `acceptAiProposalAction`, refresh, history shows the new entry. Reject →
   `rejectAiProposalAction`, document unchanged.
7. Right context: project, target, words/blocks/chapters, language, voice (BrandProfile active
   → "Voz editorial aplicada"), processing mode, history count.
8. ES/EN parity, ARIA (`aria-selected/expanded/busy/pressed`, live region), keyboard, reduced
   motion; responsive (three columns → stacked with drawers on narrow screens).

## Out of scope

Chat, prompt box, tone/SEO/title tools, quality scores, recording rejections, changing the
AI engine or its prompts.
