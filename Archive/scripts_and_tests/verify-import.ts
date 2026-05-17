#!/usr/bin/env tsx
/**
 * Script de verificacion de importacion
 * Verifica que el DOCX no genere capitulos falsos
 * 
 * Uso: npx tsx scripts/verify-import.ts /ruta/a/documento.docx
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { extractImportedDocumentSeed } from '../src/lib/projects/import';

async function verifyImport(filePath: string) {
  console.log('Verificando importacion:', filePath);
  
  const buffer = readFileSync(filePath);
  const file = new File([buffer], 'test.docx', { 
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
  });

  const seed = await extractImportedDocumentSeed(file);
  
  console.log('\nResultados:');
  console.log('Titulo detectado:', seed.title);
  console.log('Autor detectado:', seed.author);
  console.log('Numero de capitulos:', seed.chapters.length);
  
  // Verificar indice
  const indexChapter = seed.chapters.find(ch => 
    /indice|table of contents/i.test(ch.title)
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
    
    // Verificar que no se crearon capitulos falsos desde el indice
    const falseChapters = seed.chapters.filter(ch => 
      /^FASE \d+:/i.test(ch.title) || /^Dia \d+:/i.test(ch.title)
    );
    
    if (falseChapters.length > 0) {
      console.log('\nERROR: Se detectaron capitulos falsos creados desde el indice:');
      falseChapters.forEach(ch => console.log('  -', ch.title));
    } else {
      console.log('\nNo se detectaron capitulos falsos');
    }
  } else {
    console.log('\nNo se encontro capitulo de indice');
  }
  
  // Verificar capitulos reales
  const realChapters = seed.chapters.filter(ch => 
    !/indice/i.test(ch.title)
  );
  
  console.log('\nCapitulos reales detectados:');
  realChapters.slice(0, 10).forEach((ch, i) => {
    console.log(`  ${i + 1}. ${ch.title} (${ch.blocks.length} bloques)`);
  });
  
  // Verificacion final
  const hasIntro = realChapters.some(ch => /introduccion/i.test(ch.title));
  const hasFase1 = realChapters.some(ch => /fase 1/i.test(ch.title));
  
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
