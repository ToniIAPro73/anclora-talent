import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { MultipageFlow } from './MultipageFlow';
import { DEVICE_PAGINATION_CONFIGS } from '@/lib/preview/device-configs';

describe('MultipageFlow', () => {
  test('includes TOC-specific styles so preview pagination matches the chapter editor layout', () => {
    const { container } = render(
      <MultipageFlow
        html={
          '<ul class="toc-list">' +
          '<li data-toc-entry="true" data-toc-level="2" data-toc-page="2">Introducción</li>' +
          '</ul>'
        }
        config={DEVICE_PAGINATION_CONFIGS.laptop}
        currentPage={0}
        viewMode="single"
        margins={{ top: 24, bottom: 24, left: 24, right: 24 }}
      />,
    );

    expect(screen.getByText('Introducción')).toBeInTheDocument();

    const styles = Array.from(container.querySelectorAll('style'))
      .map((node) => node.textContent ?? '')
      .join('\n');

    expect(styles).toContain('.flow-content-root.ProseMirror [data-toc-entry="true"]');
    expect(styles).toContain('.flow-content-root.ProseMirror ul.toc-list');
    expect(styles).toContain('content: attr(data-toc-page)');
  });
});
