'use client';

import React from 'react';
import { Check } from 'lucide-react';

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
    <nav aria-label="Progress" className="ac-stepper">
      <ol role="list" className="ac-stepper__list">
        {steps.map((step, index) => (
          <li key={step.id} className="ac-stepper__item">
            <div className="ac-stepper__group">
              <button
                type="button"
                onClick={() => onStepClick?.(step.id)}
                disabled={step.status === 'pending' && step.id > activeStep + 1}
                className={`ac-stepper__trigger ${step.status === 'pending' && step.id > activeStep + 1 ? '' : 'cursor-pointer'}`}
                aria-current={step.id === activeStep ? 'step' : undefined}
              >
                {index !== 0 && (
                  <div
                    className="ac-stepper__connector"
                    data-state={step.status === 'completed' || step.id === activeStep ? 'complete' : 'pending'}
                  />
                )}

                <span
                  className="ac-stepper__dot"
                  data-state={step.status}
                >
                  {step.status === 'completed' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-bold">{step.id}</span>
                  )}
                </span>
              </button>

              <div className="mt-2 text-center">
                <span
                  className="ac-stepper__label"
                  data-state={step.status}
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
