import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('advanced editor color palette', () => {
  test('contains expanded curated editorial colors', () => {
    const file = fs.readFileSync(
      path.join(process.cwd(), 'src/components/projects/AdvancedRichTextEditor.tsx'),
      'utf8',
    );

    expect(file).toContain("name: 'Por Defecto'");
    expect(file).toContain('#EDF2F8');
    expect(file).toContain('#E5E7EB');
    expect(file).toContain('#94A3B8');
    expect(file).toContain('#0F172A');
    expect(file).toContain('#C49A24');
    expect(file).toContain('#D4A017');
    expect(file).toContain('#F59E0B');
    expect(file).toContain('#4A9FD8');
    expect(file).toContain('#60A5FA');
    expect(file).toContain('#14B8A6');
    expect(file).toContain('#2DD4BF');
    expect(file).toContain('#FB7185');
    expect(file).toContain('#F43F5E');
    expect(file).toContain('#D97706');
  });
});
