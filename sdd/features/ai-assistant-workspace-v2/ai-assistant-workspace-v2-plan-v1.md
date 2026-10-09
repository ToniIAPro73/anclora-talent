# AI Assistant Workspace v2 — Plan v1

1. Pure model `src/lib/ai/workspace-model.ts` (impact summary, change grouping, fix candidates)
   + chapter stats helper in `co-author.ts`; unit tests.
2. i18n `aiWs*` keys (ES/EN).
3. `src/components/projects/ai-workspace/`: `AiWorkspace` (single state machine),
   `AiProposalReview` (shared by `AiProposalCard`), `ActionsPanel`, `TargetPanel`, `ContextPanel`.
4. Mount in `ProjectWorkspace` step 7 (no rail); remove `AIAssistant` mock and `CoAuthorPanel`
   (+ Step 1 entry); editor page passes chapter stats, history, cloud flag.
5. Tests: model, component (states, accept/reject/stale, no provider, fixed PDF), Playwright
   with a stubbed provider (E2E_AI_STUB) and a real stale case.
6. Gates and commits.
