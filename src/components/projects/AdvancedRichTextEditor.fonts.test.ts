import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

describe('advanced editor font size scale', () => {
  test('offers the expanded editorial size scale', () => {
    const file = fs.readFileSync(
      path.join(process.cwd(), 'src/components/projects/AdvancedRichTextEditor.tsx'),
      'utf8',
    );

    expect(file).toContain('const sizes = [9, 10, 10.5, 11, 11.5, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48]');
    expect(file).toContain('value: `${points}pt`');
  });
});
