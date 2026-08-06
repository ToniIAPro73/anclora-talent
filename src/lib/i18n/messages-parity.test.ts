import { describe, expect, test } from 'vitest';
import { appMessages } from './messages';

type MessageTree = Record<string, unknown>;

function collectKeys(tree: MessageTree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object') {
      return collectKeys(value as MessageTree, path);
    }
    return [path];
  });
}

describe('i18n ES/EN parity (U7)', () => {
  const esKeys = collectKeys(appMessages.es as unknown as MessageTree).sort();
  const enKeys = collectKeys(appMessages.en as unknown as MessageTree).sort();

  test('every spanish key exists in english', () => {
    const missingInEn = esKeys.filter((key) => !enKeys.includes(key));
    expect(missingInEn).toEqual([]);
  });

  test('every english key exists in spanish', () => {
    const missingInEs = enKeys.filter((key) => !esKeys.includes(key));
    expect(missingInEs).toEqual([]);
  });

  test('no empty message values in either locale', () => {
    const empty = (tree: MessageTree, locale: string) =>
      collectKeys(tree).filter((key) => {
        const value = key
          .split('.')
          .reduce<unknown>(
            (node, part) => (node as MessageTree)?.[part],
            tree,
          );
        return typeof value === 'string' && value.trim() === '';
      }).map((key) => `${locale}.${key}`);
    expect([
      ...empty(appMessages.es as unknown as MessageTree, 'es'),
      ...empty(appMessages.en as unknown as MessageTree, 'en'),
    ]).toEqual([]);
  });
});
