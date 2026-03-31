import { createProjectRecord } from './factories';
import type { ProjectRecord } from './types';

export function createMockProjectStore() {
  const seed = createProjectRecord('demo-user', {
    title: 'Guía editorial para equipos creativos',
  });

  return new Map<string, ProjectRecord>([[seed.id, seed]]);
}
