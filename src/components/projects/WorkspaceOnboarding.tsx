'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { AppMessages } from '@/lib/i18n/messages';

type Copy = AppMessages['project'];

interface WorkspaceOnboardingProps {
  copy: Copy;
}

export const WORKSPACE_ONBOARDING_STORAGE_KEY = 'anclora-workspace-onboarding-v1';
const TOTAL_STEPS = 3;

function readStoredOnboardingSeen() {
  if (typeof window === 'undefined') {
    return true;
  }

  try {
    return window.localStorage.getItem(WORKSPACE_ONBOARDING_STORAGE_KEY) === 'seen';
  } catch {
    return true;
  }
}

/**
 * First-visit workspace onboarding (F0.1): a three-step overlay that narrates
 * the product differential — fearless editing, self-regenerating TOC and
 * pagination, and rejection-free publishing. Dismissal is persisted in
 * localStorage so it only shows once.
 */
export function WorkspaceOnboarding({ copy }: WorkspaceOnboardingProps) {
  const [visible, setVisible] = useState(() => !readStoredOnboardingSeen());
  const [step, setStep] = useState(0);

  if (!visible) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(WORKSPACE_ONBOARDING_STORAGE_KEY, 'seen');
    } catch {
      // Ignore storage failures so they never block the workspace.
    }
    setVisible(false);
  };

  const steps = [
    { title: copy.onboardingStep1Title, body: copy.onboardingStep1Body },
    { title: copy.onboardingStep2Title, body: copy.onboardingStep2Body },
    { title: copy.onboardingStep3Title, body: copy.onboardingStep3Body },
  ];
  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <div className="ac-modal" role="dialog" aria-modal="true" data-testid="workspace-onboarding">
      <div className="ac-modal__backdrop" onClick={dismiss} />
      <div className="ac-modal__panel max-w-md rounded-[24px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-6 shadow-[var(--shadow-strong)]">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
              {copy.onboardingEyebrow}
            </p>
            <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
              {steps[step].title}
            </h3>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label={copy.onboardingClose}
            data-testid="onboarding-close-button"
          >
            <X className="h-5 w-5 text-[var(--text-tertiary)]" />
          </button>
        </div>

        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{steps[step].body}</p>

        <div className="mt-6 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={dismiss}
            data-testid="onboarding-skip-button"
            className="ac-button ac-button--secondary ac-button--sm"
          >
            {copy.onboardingSkip}
          </button>
          <div className="flex items-center gap-4">
            <span className="text-xs text-[var(--text-tertiary)]" data-testid="onboarding-step-label">
              {copy.onboardingStepLabel
                .replace('{step}', String(step + 1))
                .replace('{total}', String(TOTAL_STEPS))}
            </span>
            <button
              type="button"
              data-testid="onboarding-next-button"
              onClick={() => (isLastStep ? dismiss() : setStep((current) => current + 1))}
              className="ac-button ac-button--primary ac-button--sm"
            >
              {isLastStep ? copy.onboardingDone : copy.onboardingNext}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
