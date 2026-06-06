'use client';

import { useEffect } from 'react';
import { premiumPrimaryDarkButton, premiumSecondaryLightButton } from '@/components/ui/button-styles';
import { NavigatingLink } from '@/components/ui/NavigatingLink';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app-error-boundary]', error.digest ?? error.message);
  }, [error]);

  return (
    <div className="ac-empty-state min-h-[60vh] px-6 text-center">
      <div className="space-y-3">
        <p className="ac-empty-state__eyebrow">
          Error del servidor
        </p>
        <h2 className="ac-empty-state__title">
          Algo ha fallado al cargar esta página
        </h2>
        <p className="ac-empty-state__summary max-w-md text-sm leading-7">
          El sistema ha encontrado un error inesperado. Puedes intentarlo de nuevo o volver al dashboard.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-[var(--text-tertiary)]">ref: {error.digest}</p>
        )}
      </div>
      <div className="ac-empty-state__actions">
        <button onClick={reset} className={premiumPrimaryDarkButton}>
          Reintentar
        </button>
        <NavigatingLink href="/dashboard" pendingLabel="Ir al dashboard" className={premiumSecondaryLightButton}>
          Ir al dashboard
        </NavigatingLink>
      </div>
    </div>
  );
}
