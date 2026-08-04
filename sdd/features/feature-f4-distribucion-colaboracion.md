# Fase 4 — Distribución, colaboración y ecosistema (plan de mejora v2)

Cerrada: 2026-08-04. Rama `development`.

## Entregables

1. **Integraciones de venta** — `src/lib/sales/`:
   - **Launch kit** (`launch-kit.ts`): ficha de producto + copy de landing 100% derivados del AST/metadata (bullets = H2 verbatim; descripción sin metadata → primer capítulo marcado como borrador; CTA fijo localizado). Disclosure IA incluido si procede.
   - **Gumroad push**: `POST /api/v2/products` crea producto como borrador (scope `edit_products`) — verificado contra el código fuente live de Gumroad (la doc Mintlify "not implemented" está desactualizada; ganó el código). Credenciales cifradas AES-256-GCM por usuario, token nunca vuelve al cliente.
   - **Hotmart**: sin API pública de creación de productos → paquete de export (.zip: ficha + copy + JSON + disclosure + checklist alta manual). Decisión documentada.
   - UI `PublishChannelsPanel` con badges de modo ("API · borrador" / "Export manual").
2. **Colaboración por roles** — `project_collaborators` + `project_invitations` (token 256-bit, SHA-256 en DB, 7 días, un solo uso; aceptar sin peaje/checkout) + `block_comments` (anclas ids estables AST, hilos, resolver). Matriz server-side: author todo; editor comenta + propone sugerencias (patch AST aceptable/rechazable por el autor, formato F3, provenance humana — nunca edición directa); designer comenta + diseño. UI `CollaborationPanel` + página `/invite/[token]`.
3. **API de salida del compositor + plugins de reglas por nicho** — NO implementado: el plan lo condiciona a demanda de la beta. Queda documentado aquí como pendiente (decisión del plan, no omisión).

## Commits

- `63ed2a4` launch kit · `2be11ad` Gumroad/Hotmart · `3c91874` UI publicar
- `6be6b82` colaboradores/invitaciones · `ffc0f8b` comentarios AST · `3180b48` sugerencias corrector · `3879cb3` panel colaboración

## Desviaciones

- Doc Gumroad Mintlify desactualizada vs código (push sí existe, siempre borrador).
- Sugerencia del corrector = reemplazo de texto plano de UN bloque (marcas inline/refs se aplanan; el autor revisa diff antes de aceptar).
- Superficie de edición in-app del colaborador fuera de alcance (permisos ya efectivos server-side).
- Notificaciones de comentarios: solo contador de abiertos.

## Verificación

Suite 1046 verdes. tsc baseline (77) sin nuevos. eslint limpio. `scaffolding.test.ts` flaky bajo carga paralela (pasa aislado; preexistente).
