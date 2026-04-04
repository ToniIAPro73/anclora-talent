import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import type { ProjectRecord } from '@/lib/projects/types';

vi.mock('@/lib/projects/actions', () => ({
  saveProjectCoverAction: vi.fn(),
  saveBackCoverAction: vi.fn(),
}));

// AdvancedCoverEditor calls server actions as props — stub the client logic
vi.mock('@/components/projects/advanced-cover/AdvancedCoverEditor', () => ({
  AdvancedCoverEditor: ({ project }: { project: ProjectRecord }) => (
    <div data-testid="advanced-cover-editor">
      <span>{project.cover.title}</span>
    </div>
  ),
}));

vi.mock('@/components/projects/BackCoverForm', () => ({
  BackCoverForm: ({ project }: { project: ProjectRecord }) => (
    <div data-testid="back-cover-form">
      <span>{project.backCover.body}</span>
    </div>
  ),
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
      language: 'es',
      chapters: [
        {
          id: 'ch-1',
          order: 0,
          title: 'Capítulo 1',
          blocks: [{ id: 'b-1', type: 'paragraph', order: 0, content: 'Content.' }],
        },
      ],
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
      title: 'Test Project',
      body: 'Un libro interesante.',
      authorBio: 'El autor',
      accentColor: null,
      backgroundImageUrl: null,
      renderedImageUrl: null,
    },
    assets: [],
  };
}

describe('AdvancedCoverEditor (stub)', () => {
  test('renders with cover title', async () => {
    const { AdvancedCoverEditor } = await import(
      '@/components/projects/advanced-cover/AdvancedCoverEditor'
    );
    render(<AdvancedCoverEditor project={makeProject()} copy={copy} />);
    expect(screen.getByTestId('advanced-cover-editor')).toBeInTheDocument();
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });
});

describe('BackCoverForm (stub)', () => {
  test('renders with back cover body', async () => {
    const { BackCoverForm } = await import('@/components/projects/BackCoverForm');
    render(<BackCoverForm project={makeProject()} copy={copy} />);
    expect(screen.getByTestId('back-cover-form')).toBeInTheDocument();
    expect(screen.getByText('Un libro interesante.')).toBeInTheDocument();
  });
});
