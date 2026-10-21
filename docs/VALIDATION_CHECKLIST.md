# Checklist de validación — importación y fondos del editor de cubierta (2026-10-21)

> Este fichero se sobrescribe en cada entrega. El historial queda en Git.

**Repositorio:** anclora-talent
**Rama y commit:** development @ 6cf97ae466946f0d3d05d8b704dfe4c4caccafe3
**Entorno de validación:** runtime local con `npm run dev:docker` · localhost:3000
**Datos:** sintéticos. Cuenta: `e2e.auth@anclora-talent.test` (identidad QA dedicada, no personal)

## 1. Qué cambia
- El campo de tamaño de fuente admite reemplazo directo y sugerencias habituales en píxeles.
- “Sin fondo” deja el lienzo transparente sin modificar las demás capas.
- Importar una imagen desde propiedades cambia solo el fondo y conserva las capas.
- Importar una portada/contraportada rasterizada reemplaza el diseño activo y elimina sus capas tras confirmación.
- Importar JSON solo valida, guarda y sustituye la superficie correspondiente al editor abierto; la otra superficie permanece intacta.

## 2. Ya comprobado por el agente
| Comprobación | Comando o método | Resultado | SHA |
| --- | --- | --- | --- |
| Pruebas enfocadas | `npx vitest run src/lib/projects/cover-design-package.test.ts src/components/projects/design-surface/CoverStudioV2.test.tsx src/components/projects/design-surface/PropertyControls.test.tsx src/components/projects/design-surface/BackgroundEditor.test.tsx src/components/projects/design-surface/AdvancedCoverEditor.test.tsx src/components/projects/design-surface/CoverLayerIndependence.test.tsx src/components/projects/design-surface/DesignSurfaceRenderer.test.tsx src/lib/projects/design-surface.test.ts src/lib/projects/design-surface-schema.test.ts src/lib/projects/design-surface-render.test.ts --testTimeout=20000` | PASS · 10 archivos, 116 pruebas | 6cf97ae |
| TypeScript | `npx tsc --noEmit` | PASS | 6cf97ae |
| ESLint | `npx eslint` sobre los 20 archivos TS/TSX afectados | PASS | 6cf97ae |
| Diff limpio | `git diff --check` | PASS | 6cf97ae |
| Importación visual | `agent-browser` en ambos editores; JSON actualiza solo la superficie activa, PNG plano limpia capas en contraportada y la imagen de fondo mantiene las capas | PASS · capturas y snapshot temporales en `artifacts/qa/` (ignorados por Git) | 6cf97ae |
| JSON de demostración | Parseo con `parseCoverDesignSurfacePackage` y carga en ambos editores | PASS · incluye ambas superficies editables | 6cf97ae |

## 3. Pruebas no ejecutadas (NOT_RUN)
| Prueba | Motivo concreto |
| --- | --- |
| Suite completa de todo el repositorio | No era necesaria para este cambio localizado; se ejecutó el conjunto enfocado de 116 pruebas. |
| Comprobación visual en móvil y tablet | La revisión visual interactiva se hizo en escritorio; no cambia el diseño responsivo de la aplicación. |
| Confirmación manual de PNG plano en el editor de portada | El mismo manejador se cubre con pruebas del componente y se comprobó visualmente en contraportada. |

## 4. Checklist para validar en la aplicación
Marca cada punto. Un fallo en un punto marcado **[BLOQUEANTE]** impide promocionar.

| # | Dónde | Pasos | Resultado esperado | Cuenta o configuración | Bloqueante |
| --- | --- | --- | --- | --- | --- |
| 1 | Portada | Importar el JSON de demostración | Se importan título, subtítulo, autor y arte de portada; la contraportada no cambia | Cuenta QA y proyecto sintético | Sí |
| 2 | Contraportada | Importar el mismo JSON | Se importan sus capas editables; la portada no cambia | Cuenta QA y proyecto sintético | Sí |
| 3 | Fondo de portada/contraportada | Seleccionar Imagen e importar el PNG de fondo | Cambia el fondo y las capas previas siguen presentes | Cuenta QA y los archivos `fondo-*.png` | Sí |
| 4 | Importar portada/contraportada | Importar el PNG plano y confirmar | La composición queda como imagen plana y desaparecen las capas editables | Cuenta QA y los archivos raster | Sí |
| 5 | Propiedades de texto/fondo | Reemplazar tamaño de fuente y activar “Sin fondo” | El tamaño se puede escribir o elegir; la transparencia no quita otras capas | Cuenta QA | Sí |

### Casos negativos y de borde
| # | Caso | Resultado esperado |
| --- | --- | --- |
| 1 | JSON sin la superficie activa | Error visible; no se modifica ninguna superficie. |
| 2 | JSON con la superficie opuesta inválida, al importar la actual | La superficie activa se valida e importa; la opuesta no se valida ni guarda. |
| 3 | Cancelar el diálogo al importar imagen rasterizada | El diseño y sus capas permanecen sin cambios. |
| 4 | Dejar el tamaño de fuente vacío y salir del campo | Se restaura el último valor válido. |

### Estados de interfaz afectados
- [x] Vacío · [x] Cargando · [x] Error · [x] Éxito · [ ] Móvil · [x] Escritorio · [ ] Modo oscuro

## 5. Riesgos y limitaciones
- Los cinco archivos de demostración se guardan en `/Users/toni/Downloads/Anclora-Talent-cover-test-assets` y no forman parte del repositorio.
- Las ilustraciones son imágenes raster generadas; el texto del paquete JSON sigue siendo editable.

## 6. Decisión de Toni
- [ ] Todos los puntos bloqueantes pasan
- [ ] Se promociona: escribir `PROMOTE=FULL` (staging → production → main)
- [ ] No se promociona. Motivo: ______________________
