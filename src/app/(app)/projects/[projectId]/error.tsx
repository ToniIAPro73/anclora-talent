'use client';

import { useEffect } from 'react';
import { premiumPrimaryDarkButton, premiumSecondaryLightButton } from '@/components/ui/button-styles';
import { NavigatingLink } from '@/components/ui/NavigatingLink';

export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[project-error-boundary]', error.digest ?? error.message);
  }, [error]);

  return (
    <div className="ac-empty-state min-h-[50vh] px-6 text-center">
      <div className="space-y-3">
        <p className="ac-empty-state__eyebrow">
          Error de proyecto
        </p>
        <h2 className="ac-empty-state__title">
          No se pudo cargar este proyecto
        </h2>
        <p className="ac-empty-state__summary max-w-md text-sm leading-7">
          Es posible que el proyecto haya sido eliminado o que haya ocurrido un error temporal.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-[var(--text-tertiary)]">ref: {error.digest}</p>
        )}
      </div>
      <div className="ac-empty-state__actions">
        <button onClick={reset} className={premiumPrimaryDarkButton}>
          Reintentar
        </button>
        <NavigatingLink href="/dashboard" pendingLabel="Volver al dashboard" className={premiumSecondaryLightButton}>
          Volver al dashboard
        </NavigatingLink>
      </div>
    </div>
  );
}
