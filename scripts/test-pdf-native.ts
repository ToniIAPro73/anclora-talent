import { renderToBuffer } from '@react-pdf/renderer';
import { buildProjectPdf } from '../src/lib/projects/export-builder';
import fs from 'fs';

const project = {
  id: 'test-project',
  title: 'Test Native Render',
  slug: 'test-native-render',
  document: {
    title: 'Test Document',
    author: 'Test Author',
    subtitle: 'Test Subtitle',
    language: 'es',
    chapters: [
      {
        id: 'c1',
        title: 'Capitulo 1',
        order: 1,
        blocks: [
          { id: 'b1', content: '<h1>El comienzo</h1>' },
          { id: 'b2', content: '<p>Este es un parrafo largo para comprobar si el texto renderiza correctamente en forma nativa y envuelve en varias lineas dependiendo de su longitud sin fallar en entornos sin fuentes personalizadas instaladas.</p>' }
        ]
      }
    ]
  },
  cover: {
    title: 'Cover',
    palette: 'obsidian',
    backgroundImageUrl: '',
    renderedImageUrl: '',
    surfaceState: null
  },
  backCover: {
    title: 'Back',
    palette: 'obsidian',
    backgroundImageUrl: '',
    renderedImageUrl: '',
    surfaceState: null
  },
  content: '<h1>El comienzo</h1><p>Test contenido fallback</p>',
  updatedAt: new Date(),
} as any;

async function run() {
  const pdfDoc = await buildProjectPdf(project);
  const buffer = await renderToBuffer(pdfDoc);
  fs.writeFileSync('test-native.pdf', buffer);
  console.log('PDF native render test completed. Size:', buffer.byteLength);
}
run().catch(console.error);
