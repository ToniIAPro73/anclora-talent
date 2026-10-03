import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { MarginSelector } from './MarginSelector';

describe('MarginSelector', () => {
  test('shows the active non-normal preset instead of a generic Normal label', () => {
    const onMarginsChange = vi.fn();

    render(
      <MarginSelector
        margins={{ top: 36, bottom: 36, left: 48, right: 36 }}
        onMarginsChange={onMarginsChange}
      />,
    );

    expect(screen.getByTestId('margin-selector-toggle')).toHaveTextContent('Estilo libro');
  });

  test('syncs controlled margins and keeps dropdown actions non-submitting', () => {
    const onMarginsChange = vi.fn();
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());

    const { container, rerender } = render(
      <form onSubmit={onSubmit}>
        <MarginSelector
          margins={{ top: 24, bottom: 24, left: 24, right: 24 }}
          onMarginsChange={onMarginsChange}
          wordsPerPage={450}
        />
      </form>,
    );

    fireEvent.click(screen.getByRole('button', { name: /configuración de márgenes/i }));

    const panel = container.querySelector('div[class*="fixed"][class*="top-"]');
    const inputs = panel?.querySelectorAll('input[type="number"]');

    expect(panel).toHaveClass('w-[min(92vw,420px)]');
    expect(panel).toHaveClass('max-h-[calc(100vh-5rem)]');
    expect(panel).toHaveClass('overflow-y-auto');
    expect(panel).toHaveClass('rounded-2xl');
    expect(panel).toHaveTextContent('Márgenes Personalizados');
    expect(panel).toHaveTextContent('~450 palabras/página');
    expect(inputs).toHaveLength(4);
    expect(inputs?.[0]).toHaveValue(24);
    expect(inputs?.[1]).toHaveValue(24);
    expect(inputs?.[2]).toHaveValue(24);
    expect(inputs?.[3]).toHaveValue(24);

    rerender(
      <form onSubmit={onSubmit}>
        <MarginSelector
          margins={{ top: 48, bottom: 48, left: 48, right: 48 }}
          onMarginsChange={onMarginsChange}
          wordsPerPage={450}
        />
      </form>,
    );

    const syncedInputs = container.querySelectorAll('div[class*="fixed"][class*="top-"] input[type="number"]');
    expect(syncedInputs).toHaveLength(4);
    expect(syncedInputs[0]).toHaveValue(48);
    expect(syncedInputs[1]).toHaveValue(48);
    expect(syncedInputs[2]).toHaveValue(48);
    expect(syncedInputs[3]).toHaveValue(48);

    const presetButtons = container.querySelectorAll('div[class*="fixed"][class*="top-"] button');
    expect(presetButtons.length).toBeGreaterThan(0);
    expect(presetButtons[0]).toHaveAttribute('type', 'button');

    fireEvent.click(presetButtons[0]);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('displays Personalizado label and provides selectable Personalizado preset button', () => {
    const onMarginsChange = vi.fn();
    const customSnapshot = { top: 38, bottom: 38, left: 94, right: 83 };

    const { rerender } = render(
      <MarginSelector
        margins={customSnapshot}
        customSnapshot={customSnapshot}
        activePreset="custom"
        onMarginsChange={onMarginsChange}
      />,
    );

    // Button shows Personalizado
    const toggle = screen.getByTestId('margin-selector-toggle');
    expect(toggle).toHaveTextContent('Personalizado');

    // Open dropdown
    fireEvent.click(toggle);

    // Personalizado option exists
    const customOption = screen.getByTestId('margin-preset-custom-button');
    expect(customOption).toBeInTheDocument();
    expect(customOption).toHaveTextContent('Personalizado');
    expect(customOption).toHaveTextContent('38px / 38px / 94px / 83px');

    // Select Estilo libro
    const bookOption = screen.getByTestId('margin-preset-book-style-button');
    expect(bookOption).toBeInTheDocument();
    fireEvent.click(bookOption);

    expect(onMarginsChange).toHaveBeenCalledWith(
      { top: 36, bottom: 36, left: 48, right: 36 },
      'bookStyle',
    );

    // Now re-render with bookStyle active, but retaining customSnapshot
    rerender(
      <MarginSelector
        margins={{ top: 36, bottom: 36, left: 48, right: 36 }}
        customSnapshot={customSnapshot}
        activePreset="bookStyle"
        onMarginsChange={onMarginsChange}
      />,
    );

    // Toggle shows Estilo libro
    expect(screen.getByTestId('margin-selector-toggle')).toHaveTextContent('Estilo libro');

    // Open dropdown again
    fireEvent.click(screen.getByTestId('margin-selector-toggle'));

    // Personalizado still exists!
    const customOptionAgain = screen.getByTestId('margin-preset-custom-button');
    expect(customOptionAgain).toBeInTheDocument();

    // Select Personalizado to restore original custom snapshot
    fireEvent.click(customOptionAgain);
    expect(onMarginsChange).toHaveBeenLastCalledWith(customSnapshot, 'custom');
  });
});
