# Collaboration Workspace v2 — Specification v1

## Scope

Replace the Step 6 (`Colaborar`) vertical panel (`CollaborationPanel`: team,
comments, suggestions and invitation form stacked in one column) with a
review workspace that follows
`docs/mockups/workspace-system-v1/11-collaboration-v1.png`:

```
header + 8-step stepper (shared)
┌ Equipo ┬ chapter reader (anchors) ┬ Comentarios | Sugerencias ┐
```

No new collaboration engine: server actions, permission matrix, AST block
anchors, suggestion pipeline and `CollaborationView` are reused.

## Existing contract (unchanged)

| Role | Allowed (server matrix, `permissions.ts`) |
| --- | --- |
| author | manage-collaborators, comment, resolve-comment, propose-suggestion, decide-suggestion, edit-content, edit-design |
| editor (Corrector) | comment, propose-suggestion |
| designer (Maquetador) | comment, edit-design |

UI guards only shape rendering; every write re-checks the matrix on the server.
Forbidden controls are hidden, not disabled.

## Audit matrix

| Feature | Current | Mockup | Decision |
| --- | --- | --- | --- |
| Step 6 layout | legacy rail + narrow stacked panel | 3-column workspace | REMOVE rail, REFINE to workspace |
| Team list | rows with email + oversized badge + always-visible revoke | avatar, name, compact role chip | REFINE; revoke into a row menu (author) |
| Owner in team | not listed | listed first as Propietario/Autor | MISSING → add owner to the read model |
| Invitations | permanent form + list | `Invitar` button | MOVE form to a dialog; keep pending list compact |
| Invite link | long box under the form | — | KEEP copy, compact inline feedback |
| Comments | only blocks that already have threads; no way to start a thread | reader with anchored highlights | MISSING → chapter reader exposes every block |
| Thread card | author/role/date/status, flat | author, time, excerpt, replies, resolve | REFINE (excerpt + counts) |
| Chapter filter | none | chapter selector | MISSING → add (client-side) |
| Status filter | none | Todos los hilos | MISSING → Todos/Abiertos/Resueltos |
| Suggestions | summary + accept/reject | — | REFINE: before/after diff, stale state, own tab |
| Activity | none | none | OMITTED (no canonical event source; nothing invented) |
| Go to context | none | highlight in reader | KEEP honest: select chapter + scroll/highlight block in the reader |
| Collaborator access | invitee lands on dashboard; the owner-scoped editor route 404s | — | MISSING → collaborator route `/projects/[id]/collaborate` (same workspace, role-resolved on the server) |
| Fixed PDF | panel unaware | — | team/invitations only; comments/suggestions explained as unsupported |

## Read-model extension (`CollaborationView`, built server-side once)

`viewerId`, `owner`, `outline` (chapters → blocks with plain-text previews and
type), per-suggestion `changes` (before/after plain text from the stored
operations), `stale` (the stored patch no longer applies to the current
document), `authorRole`, chapter of the affected block. No client queries.

## Acceptance criteria

1. Step 6 has no legacy progress rail and uses the full preview/cover width.
2. Left `Equipo`: owner + collaborators (initials, name, role chip, email as
   secondary text), author-only row menu (revoke), compact pending
   invitations (author only), `Invitar colaborador` opens a dialog (email,
   role Corrector/Maquetador with one-line descriptions, sending/error/success
   states, copy link → `Enlace copiado`). Dialog: focus trap, Escape, focus
   return.
3. Center chapter reader with chapter selector (`Todos los capítulos` shows only
   blocks that have threads), per-block comment count and `Comentar` entry.
4. Right panel tabs `Comentarios | Sugerencias`: status filter, thread cards with
   source excerpt, replies, composer (min/max height), `Resolver` (author),
   `Ver en capítulo`; suggestions with Antes/Después, accept/reject (author),
   read-only status for others, stale warning, `Pendientes de tu decisión` for
   the author.
5. Roles: author sees everything; corrector sees comments, replies and the
   proposal flow only; maquetador sees comments and replies only.
6. Empty states: `Trabajas solo en este proyecto.`, `No hay comentarios abiertos.`,
   `No hay sugerencias pendientes.`
7. Refresh after every successful write (invite, cancel, revoke, comment,
   reply, resolve, accept, reject) through the existing `router.refresh()`.
8. ES/EN parity; keyboard and ARIA (`role=tablist/tab`, `aria-selected`,
   `aria-expanded`, dialog semantics); role/status never colour-only.
9. Responsive: three columns on large screens; Equipo as drawer and panels
   stacked on narrow screens; no horizontal page overflow.

## Out of scope

Realtime/websockets, reopening threads, direct corrector edits, a real
activity feed, deep links to exact text offsets (anchors are block ids).
