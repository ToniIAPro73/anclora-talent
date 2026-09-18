# Anclora Talent — Content + Chapter Editor Mockup Revision

Status: `MOCKUPS_READY_FOR_REVIEW`

## Reference note

The supplied PDFs named `Anclora Talent _Contenido.pdf` and `Anclora Talent _ Nuevo Proyecto.pdf`, and the production chapter-editor screenshot, were not present in the accessible workspace. The revision therefore uses the verified repository components, the local user manual, the approved Cover mockup, and the approved Chapters mockup as source material. No unsupported production behavior was added to the visual proposal.

## Content V2

The previous Content mockup was conceptually wrong because it represented a manuscript/chapter writing surface. That belongs to the Chapter Editor.

Content V2 is now a global document control center:

- compact workspace navigation: `Resumen`, `Metadatos`, `Composición`, `Marca`, `Pre-flight`, `Versiones`;
- document identity: title, author, subtitle, language and ISBN state;
- compact document statistics: chapters, words, characters, reading time and estimated pages;
- active composition preset with grouped rule categories and current violations;
- applied brand profile with version, palette and typography summary;
- document health indicators and publication readiness;
- KDP, IngramSpark and Kobo pre-flight summaries with one expanded diagnostic group;
- contextual actions for editorial AI, coherence review, preview, save version and history.

The old vertical stack is replaced by a balanced three-column control surface. Advanced areas are represented as compact sections or contextual panels rather than six pages of scrolling cards.

## Chapter Editor V1

The new Chapter Editor is the writing surface reached from Chapters → `Abrir capítulo`.

- preserves chapter navigation, page navigation, responsive/device view, single/double page, rich text, font and size, formatting, alignment, H1–H6, indentation, lists, links, images, page breaks, undo/redo and zoom;
- groups controls into `Vista`, `Estilo`, `Texto`, `Párrafo`, `Estructura`, `Insertar`, `Historial` and `Zoom`;
- maximizes the central manuscript page and keeps side panels narrow and secondary;
- includes an outline panel, chapter context/health panel, focus mode and a minimal status bar;
- makes `Volver a Capítulos`, previous/next chapter and `Capítulo 1 / 6` explicit.

The manuscript is now the visual hero. Content no longer competes with the writing surface.

## Chapters overview

`03-chapters-v1.png` remains unchanged. Its management role is already correct: ordering, state, metadata, health and `Abrir capítulo`. The new editor completes the next state in that interaction story.

## New Project V1

`00b-new-project-v1.png` is a pre-workflow creation workspace. It intentionally has no canonical eight-stage stepper because the project does not exist yet.

It represents the current creation capabilities in one compact viewport:

- project title;
- start from scratch or import;
- supported source formats and 50 MB limit;
- product templates: Libro estándar, Manual técnico, Guía / lead magnet, Curso modular, Bundle;
- editorial styles: Sin referencia, Estilo de Talent, Mis estilos editoriales, reference document;
- brand manual application and analysis state;
- live project summary and create action.

Progressive disclosure keeps upload/analysis surfaces compact while preserving the real choices.

## Contact sheet

The updated contact sheet includes Dashboard, New Project, Content V2, Chapters, Chapter Editor, Cover, Back Cover, Preview, Collaboration, AI Assistant and Export. Project Overview remains omitted because no separate supported landing surface was identified.

## Implementation boundary

- Product code modified: **NO**
- Routes/API/database modified: **NO**
- Production UI replaced: **NO**
- Implementation performed: **NO**
