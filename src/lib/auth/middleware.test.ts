import { describe, expect, test, vi } from 'vitest';
import { protectRequest } from './middleware';

describe('protectRequest', () => {
  test('protects a request using sign-in as unauthenticated target', async () => {
        const protect = vi.fn().mockResolvedValue(undefined);

        await protectRequest({ protect });

        expect(protect).toHaveBeenCalledWith({
          unauthenticatedUrl: '/sign-in',
        });
  });
});
