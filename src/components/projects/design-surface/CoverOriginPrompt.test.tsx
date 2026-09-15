import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { CoverOriginPrompt } from './CoverOriginPrompt';
import { resolveLocaleMessages } from '@/lib/i18n/messages';

const copy = resolveLocaleMessages('es').coverDesignSurface.origin;

describe('CoverOriginPrompt', () => {
  test('hides the original-page choices when the project has no source-document asset', () => {
    render(
      <CoverOriginPrompt
        copy={copy}
        hasOriginalAsset={false}
        onUseOriginal={vi.fn()}
        onEditAsBase={vi.fn()}
        onChooseTemplate={vi.fn()}
        onCreateFromScratch={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('cover-origin-use-original-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cover-origin-edit-as-base-button')).not.toBeInTheDocument();
    expect(screen.getByTestId('cover-origin-choose-template-button')).toBeInTheDocument();
    expect(screen.getByTestId('cover-origin-create-from-scratch-button')).toBeInTheDocument();
  });

  test('offers all four choices when a source-document asset exists', () => {
    render(
      <CoverOriginPrompt
        copy={copy}
        hasOriginalAsset
        onUseOriginal={vi.fn()}
        onEditAsBase={vi.fn()}
        onChooseTemplate={vi.fn()}
        onCreateFromScratch={vi.fn()}
      />,
    );
    expect(screen.getByTestId('cover-origin-use-original-button')).toBeInTheDocument();
    expect(screen.getByTestId('cover-origin-edit-as-base-button')).toBeInTheDocument();
  });

  test('calls onUseOriginal and shows a busy state while it resolves', async () => {
    let resolve: () => void = () => {};
    const onUseOriginal = vi.fn(() => new Promise<void>((res) => { resolve = res; }));
    render(
      <CoverOriginPrompt
        copy={copy}
        hasOriginalAsset
        onUseOriginal={onUseOriginal}
        onEditAsBase={vi.fn()}
        onChooseTemplate={vi.fn()}
        onCreateFromScratch={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('cover-origin-use-original-button'));
    expect(onUseOriginal).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('cover-origin-prompt-busy')).toBeInTheDocument());
    resolve();
    await waitFor(() => expect(screen.queryByTestId('cover-origin-prompt-busy')).not.toBeInTheDocument());
  });

  test('choosing a template or starting from scratch calls the matching callback directly', () => {
    const onChooseTemplate = vi.fn();
    const onCreateFromScratch = vi.fn();
    render(
      <CoverOriginPrompt
        copy={copy}
        hasOriginalAsset={false}
        onUseOriginal={vi.fn()}
        onEditAsBase={vi.fn()}
        onChooseTemplate={onChooseTemplate}
        onCreateFromScratch={onCreateFromScratch}
      />,
    );
    fireEvent.click(screen.getByTestId('cover-origin-choose-template-button'));
    fireEvent.click(screen.getByTestId('cover-origin-create-from-scratch-button'));
    expect(onChooseTemplate).toHaveBeenCalled();
    expect(onCreateFromScratch).toHaveBeenCalled();
  });
});
