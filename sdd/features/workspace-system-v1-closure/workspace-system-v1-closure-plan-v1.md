# Workspace System v1 Closure — Plan v1

1. Document end-to-end `00`–`13` mockup-to-code parity matrix and identified gaps (`WS-01`..`WS-04`) in `workspace-system-v1-closure-spec-v1.md`.
2. Extend `src/lib/i18n/messages.ts` (`es` and `en`) with localized keys for `CreateProjectForm`, `ProjectWorkspace`, and `AdvancedCoverEditor`.
3. Update `CreateProjectForm.tsx`, `ProjectWorkspace.tsx`, `AdvancedCoverEditor.tsx`, and `src/app/(app)/projects/[projectId]/preview/page.tsx`.
4. Add unit/component test coverage in `CreateProjectForm.test.tsx` and `ProjectWorkspace.test.tsx` for EN localization and `?step=` / `?documentData=open` deep-linking.
5. Update `docs/manual/manual-usuario.md` to reflect the v2 workspaces, recapture the 13 `STALE` screenshots in `docs/manual/screenshots/`, update `docs/manual/screenshots.manifest.json`, `docs/manual/RECAPTURE.md`, and `docs/manual/MANUAL_CHANGELOG.md`, and regenerate `public/manuals/anclora-talent-manual-usuario-es.pdf`.
