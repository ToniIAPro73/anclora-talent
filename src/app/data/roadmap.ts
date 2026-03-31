import type { Initiative } from '../types';

export const initiatives: Initiative[] = [
  {
    title: 'Base documental y reglas de ejecución',
    status: 'ready',
    summary: 'Definir alcance MVP, arquitectura, modelo de datos y criterios de implementación.',
  },
  {
    title: 'Core editorial',
    status: 'active',
    summary: 'Proyecto, documento estructurado, editor, assets y preview sobre contenido real.',
  },
  {
    title: 'Importación y exportación',
    status: 'next',
    summary: 'DOCX y TXT primero; PDF con extracción asistida; PDF y EPUB como salidas prioritarias.',
  },
];

export const nowCards = [
  {
    title: 'MVP 01',
    value: 'Importar DOCX/TXT',
    detail: 'Normalizar a un documento canónico por bloques.',
  },
  {
    title: 'MVP 02',
    value: 'Editor real',
    detail: 'Capítulos, párrafos, imágenes y estilos semánticos.',
  },
  {
    title: 'MVP 03',
    value: 'Preview + PDF',
    detail: 'Render fiel con pipeline de exportación inicial.',
  },
];
