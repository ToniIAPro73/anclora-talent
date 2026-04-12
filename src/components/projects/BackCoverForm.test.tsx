import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import type { ProjectRecord } from '@/lib/projects/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock('@/lib/projects/actions', () => ({
  saveBackCoverAction: vi.fn(),
}));

const copy = resolveLocaleMessages('es').project;

function makeProject(): ProjectRecord {
  return {
    id: 'p-1',
    userId: 'u-1',
    workspaceId: null,
    slug: 'test',
    title: 'Test Project',
    status: 'draft',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    document: {
      id: 'd-1',
      title: 'Test Project',
      subtitle: 'Sub',
      author: 'Antonio',
      language: 'es',
      chapters: [],
    },
    cover: {
      id: 'cov-1',
      title: 'Test Project',
      subtitle: 'Sub',
      palette: 'obsidian',
      backgroundImageUrl: null,
      thumbnailUrl: null,
    },
    backCover: {
      id: 'bc-1',
      title: 'Antonio',
      body: 'Un libro interesante.',
      authorBio: 'El autor',
      accentColor: null,
      backgroundImageUrl: null,
      renderedImageUrl: null,
    },
    assets: [],
  };
}

describe('BackCoverForm advanced sync notice', () => {
  test('shows a sync notice when an advanced back cover already exists', async () => {
    const { BackCoverForm } = await import('@/components/projects/BackCoverForm');
    const project = makeProject();
    project.backCover.surfaceState = {
      surface: 'back-cover',
      layout: { kind: 'stacked-center' },
      fields: {
        title: { value: 'Antonio', visible: true },
        body: { value: 'Un libro interesante.', visible: true },
        authorBio: { value: 'El autor', visible: true },
      },
      layers: [{ id: 'back-cover-title', type: 'text', fieldKey: 'title', fill: '#f2e3b3', fontSize: 28 }],
      opacity: 0.32,
    };

    render(<BackCoverForm project={project} copy={copy} />);

    expect(screen.getByText(copy.backCoverAdvancedSyncNotice)).toBeInTheDocument();
  });

  test('does not show the sync notice when there is no advanced back-cover state yet', async () => {
    const { BackCoverForm } = await import('@/components/projects/BackCoverForm');
    render(<BackCoverForm project={makeProject()} copy={copy} />);

    expect(screen.queryByText(copy.backCoverAdvancedSyncNotice)).not.toBeInTheDocument();
  });
});
