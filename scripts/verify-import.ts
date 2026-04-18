#!/usr/bin/env tsx
/**
 * Script de verificacion de importacion
 * Verifica que el DOCX no genere capitulos falsos
 * 
 * Uso: npx tsx scripts/verify-import.ts /ruta/a/documento.docx
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildImportedDocumentSeed,
  extractTextFromBuffer,
  normalizeText,
} from '../src/lib/projects/import-pipeline';

function normalizeMatch(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

async function verifyImport(filePath: string) {
  console.log('Verificando importacion:', filePath);
  
  const buffer = readFileSync(filePath);
  const extracted = await extractTextFromBuffer(
    'test.docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    Buffer.from(buffer),
  );
  const seed = buildImportedDocumentSeed({
    fileName: 'test.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    text: normalizeText(extracted.text),
    html: extracted.html,
    sourcePageCount: extracted.pageCount,
  });
  
  console.log('\nResultados:');
  console.log('Titulo detectado:', seed.title);
  console.log('Autor detectado:', seed.author);
  console.log('Numero de capitulos:', seed.chapters.length);
  
  // Verificar indice
  const indexChapter = seed.chapters.find(ch => 
    /indice|table of contents/i.test(normalizeMatch(ch.title))
  );
  
  if (indexChapter) {
    const indexLines = indexChapter.blocks.length;
    console.log('\nCapitulo Indice encontrado:');
    console.log('  - Bloques:', indexLines);
    console.log('  - Primeras lineas:');
    indexChapter.blocks.slice(0, 5).forEach((b, i) => {
      console.log(`    ${i + 1}. ${b.content.substring(0, 60)}...`);
    });
    
    // Verificacion critica: el indice NO debe tener numeros de pagina
    const hasNumbers = indexChapter.blocks.some(b => /[·\-–—]{2,}\s*\d+/.test(b.content));
    console.log('  - Tiene numeros?:', hasNumbers ? 'SI (incorrecto)' : 'NO (correcto)');
    
    // Verificar entradas estructurales huérfanas usando outline detectado.
    // Mucho más fiable que leer texto fusionado de bloques <ul>.
    const outlineEntries = (seed.detectedOutline ?? [])
      .map((entry) => normalizeMatch(entry.title))
      .filter((entry) => entry && entry !== 'indice');

    const realChapterKeys = seed.chapters
      .filter((ch) => ch.title !== indexChapter.title)
      .map((ch) => normalizeMatch(ch.title));

    const suspiciousMissingChapters = outlineEntries.filter((entry) => {
      if (!/^(fase\s+\d+|dia\s+\d+|introduccion|recursos|despues\s+de|cierre)/i.test(entry)) {
        return false;
      }
      return !realChapterKeys.some((chapter) =>
        chapter === entry || chapter.includes(entry) || entry.includes(chapter),
      );
    });

    if (suspiciousMissingChapters.length > 0) {
      console.log('\nERROR: Hay entradas estructurales en índice sin capítulo real asociado:');
      suspiciousMissingChapters.forEach(ch => console.log('  -', ch));
    } else {
      console.log('\nNo se detectaron duplicados ni entradas estructurales huérfanas');
    }
  } else {
    console.log('\nNo se encontro capitulo de indice');
  }
  
  // Verificar capitulos reales
  const realChapters = seed.chapters.filter(ch => 
    !/indice/i.test(normalizeMatch(ch.title))
  );
  
  console.log('\nCapitulos reales detectados:');
  realChapters.slice(0, 10).forEach((ch, i) => {
    console.log(`  ${i + 1}. ${ch.title} (${ch.blocks.length} bloques)`);
  });
  
  // Verificacion final
  const hasIntro = realChapters.some(ch => /introduccion/i.test(normalizeMatch(ch.title)));
  const hasFase1 = realChapters.some(ch => /fase 1/i.test(normalizeMatch(ch.title)));
  
  console.log('\nVerificacion final:');
  console.log('  - Tiene Introduccion?:', hasIntro ? 'SI' : 'NO');
  console.log('  - Tiene FASE 1 como capitulo?:', hasFase1 ? 'SI' : 'NO');
  
  const allGood = hasIntro && hasFase1 && indexChapter;
  console.log('\n' + (allGood ? 'IMPORTACION CORRECTA' : 'IMPORTACION CON ERRORES'));
  
  return allGood;
}

// Ejecutar
const filePath = process.argv[2] || resolve(process.cwd(), 'Nunca_mas_en_la_sombra.docx');
verifyImport(filePath).catch(console.error);
