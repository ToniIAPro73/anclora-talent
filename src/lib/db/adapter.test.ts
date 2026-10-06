import { describe, expect, it } from 'vitest';
import { isLocalDatabaseUrl } from './adapter';

describe('database adapter selection', () => {
  it.each([
    'postgresql://user:password@localhost:5432/database',
    'postgresql://user:password@127.0.0.1:5432/database',
    'postgresql://user:password@[::1]:5432/database',
  ])('recognizes local PostgreSQL URL: %s', (databaseUrl) => {
    expect(isLocalDatabaseUrl(databaseUrl)).toBe(true);
  });

  it('keeps remote PostgreSQL URLs on the remote adapter path', () => {
    expect(isLocalDatabaseUrl('postgresql://user:password@ep-example.neon.tech/database')).toBe(false);
  });
});

