import nextConfig from '../../next.config';

describe('server action configuration', () => {
  test('allows imported project documents larger than the default body limit', () => {
    const limit = nextConfig.experimental?.serverActions?.bodySizeLimit;
    expect(limit).toBe('55mb');
  });

  test('U4: the body limit is at least 25mb for robust uploads', () => {
    const limit = nextConfig.experimental?.serverActions?.bodySizeLimit;
    const limitMb = Number.parseInt(String(limit), 10);
    expect(Number.isFinite(limitMb)).toBe(true);
    expect(limitMb).toBeGreaterThanOrEqual(25);
  });
});
