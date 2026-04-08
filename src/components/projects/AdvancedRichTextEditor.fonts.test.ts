import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

describe('advanced editor font size scale', () => {
  test('offers the expanded editorial size scale', () => {
    const file = fs.readFileSync(
      path.join(process.cwd(), 'src/components/projects/AdvancedRichTextEditor.tsx'),
      'utf8',
    );

    expect(file).toContain("value: '10px'");
    expect(file).toContain("value: '48px'");
  });
});
