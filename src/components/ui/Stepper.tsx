'use client';

import React from 'react';
import { Check, Circle } from 'lucide-react';

export interface Step {
  id: number;
  title: string;
  description?: string;
  status: 'pending' | 'active' | 'completed';
}

interface StepperProps {
  steps: Step[];
  activeStep: number;
  onStepClick?: (stepId: number) => void;
}

export function Stepper({ steps, activeStep, onStepClick }: StepperProps) {
  return (
    <nav aria-label="Progress" className="w-full">
      <ol role="list" className="flex flex-wrap items-center justify-between gap-4 md:flex-nowrap">
        {steps.map((step, index) => (
          <li key={step.id} className="relative flex-1">
            <div className="group flex flex-col items-center">
              <button
                type="button"
                onClick={() => onStepClick?.(step.id)}
                disabled={step.status === 'pending' && step.id > activeStep + 1}
                className={`relative flex items-center justify-center ${
                  step.status === 'pending' && step.id > activeStep + 1 ? '' : 'cursor-pointer'
                }`}
                aria-current={step.id === activeStep ? 'step' : undefined}
              >
                {/* Connector Line */}
                {index !== 0 && (
                  <div
                    className={`absolute left-[-50%] right-[50%] top-1/2 h-0.5 -translate-y-1/2 transition-colors duration-300 ${
                      step.status === 'completed' || step.id === activeStep
                        ? 'bg-[var(--accent)]'
                        : 'bg-[var(--border-subtle)]'
                    }`}
                    style={{ width: 'calc(100% - 2rem)', left: 'calc(-50% + 1rem)' }}
                  />
                )}

                {/* Step Circle */}
                <span
                  className={`relative flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    step.status === 'completed'
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--text-on-accent)]'
                      : step.status === 'active'
                      ? 'border-[var(--accent)] bg-[var(--surface)] text-[var(--accent)] shadow-[0_0_15px_rgba(74,159,216,0.3)]'
                      : 'border-[var(--border-subtle)] bg-[var(--surface-soft)] text-[var(--text-muted)]'
                  }`}
                >
                  {step.status === 'completed' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-bold">{step.id}</span>
                  )}
                </span>
              </button>

              {/* Step Label */}
              <div className="mt-2 text-center">
                <span
                  className={`block text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 ${
                    step.status === 'active' ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary,var(--text-muted))]'
                  }`}
                >
                  {step.title}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}
