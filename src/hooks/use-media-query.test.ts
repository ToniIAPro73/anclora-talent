import { renderHook, act } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { useMediaQuery } from './use-media-query';

function mockMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<() => void>();
  const mql = {
    get matches() {
      return matches;
    },
    addEventListener: (_event: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_event: string, listener: () => void) => listeners.delete(listener),
  };
  vi.stubGlobal('matchMedia', vi.fn(() => mql));
  return {
    setMatches(next: boolean) {
      matches = next;
      listeners.forEach((listener) => listener());
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useMediaQuery', () => {
  test('reflects the current matchMedia state', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(true);
  });

  test('updates when the media query change event fires', () => {
    const control = mockMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(false);

    act(() => control.setMatches(true));
    expect(result.current).toBe(true);
  });
});
