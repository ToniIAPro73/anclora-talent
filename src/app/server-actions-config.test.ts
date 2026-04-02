import nextConfig from '../../next.config';

describe('server action configuration', () => {
  test('allows imported project documents larger than the default body limit', () => {
    expect(nextConfig.experimental?.serverActions?.bodySizeLimit).toBe('8mb');
  });
});
