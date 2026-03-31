# Architecture and Testing Review

## Resumen ejecutivo

La base modular del frontend ya es correcta, pero el repo todavía estaba demasiado cerca de una
demo estática. La intervención prioritaria fue introducir un documento canónico y una base mínima
de testing para impedir que editor y preview evolucionen como representaciones paralelas.

## Deuda técnica priorizada

### P0

- No existía un documento compartido entre features.
- No existía ninguna suite de tests.
- El README no describía el producto actual.

### P1

- `upload`, `cover` y `strategy` siguen siendo pantallas de orientación más que features cerradas.
- El pipeline real de importación no existe todavía para `txt` y `docx`.
- No hay exportación PDF real ni cola de jobs.

### P2

- Hay dependencias de backend instaladas sin una integración activa.
- Falta una separación explícita entre dominio editorial y futuros adaptadores de import/export.
- Falta observabilidad de errores en runtime más allá de build/test/lint.

## Huecos de testing

- Falta cubrir rendering de `PreviewScreen` sobre cada tipo de bloque.
- Falta cubrir `EditorScreen` a nivel de interacción de textarea por capítulo.
- Falta testear navegación de app y persistencia futura del estado.
- Cuando llegue importación real, hará falta testear mapeos de `txt` y `docx` al documento canónico.

## Decisiones tomadas

- Usar Vitest con `jsdom` y Testing Library.
- Mantener el store editorial en `src/domain/document/store.tsx`.
- Dejar el documento de muestra como fixture viva del MVP para poder desarrollar el flujo antes de
  conectar backend.

## Siguiente fase recomendada

1. Añadir adaptadores locales `txt` y `docx`.
2. Introducir persistencia del proyecto.
3. Renderizar preview paginado con tema editorial.
4. Añadir exportación PDF mínima sobre el mismo contrato de documento.
