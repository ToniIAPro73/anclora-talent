import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { WorkspaceOnboarding, WORKSPACE_ONBOARDING_STORAGE_KEY } from './WorkspaceOnboarding';

const copy = resolveLocaleMessages('es').project;

describe('WorkspaceOnboarding', () => {
  beforeEach(() => window.localStorage.clear());

  it('renders the first step on first visit', () => {
    render(<WorkspaceOnboarding copy={copy} />);
    expect(screen.getByTestId('workspace-onboarding')).toBeInTheDocument();
    expect(screen.getByText('Revisa sin miedo')).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-step-label')).toHaveTextContent('Paso 1 de 3');
  });

  it('walks through the three steps and dismisses with "Entendido"', () => {
    render(<WorkspaceOnboarding copy={copy} />);

    fireEvent.click(screen.getByTestId('onboarding-next-button'));
    expect(screen.getByText('Nunca más un índice desactualizado')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('onboarding-next-button'));
    expect(screen.getByText('Publica sin rechazos')).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-next-button')).toHaveTextContent('Entendido');

    fireEvent.click(screen.getByTestId('onboarding-next-button'));
    expect(screen.queryByTestId('workspace-onboarding')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(WORKSPACE_ONBOARDING_STORAGE_KEY)).toBe('seen');
  });

  it('skip button dismisses and persists', () => {
    render(<WorkspaceOnboarding copy={copy} />);
    fireEvent.click(screen.getByTestId('onboarding-skip-button'));
    expect(screen.queryByTestId('workspace-onboarding')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(WORKSPACE_ONBOARDING_STORAGE_KEY)).toBe('seen');
  });

  it('close button dismisses and persists', () => {
    render(<WorkspaceOnboarding copy={copy} />);
    fireEvent.click(screen.getByTestId('onboarding-close-button'));
    expect(screen.queryByTestId('workspace-onboarding')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(WORKSPACE_ONBOARDING_STORAGE_KEY)).toBe('seen');
  });

  it('does not render when already seen', () => {
    window.localStorage.setItem(WORKSPACE_ONBOARDING_STORAGE_KEY, 'seen');
    render(<WorkspaceOnboarding copy={copy} />);
    expect(screen.queryByTestId('workspace-onboarding')).not.toBeInTheDocument();
  });
});
