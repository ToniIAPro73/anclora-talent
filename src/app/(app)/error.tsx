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
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
          Error del servidor
        </p>
        <h2 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">
          Algo ha fallado al cargar esta página
        </h2>
        <p className="max-w-md text-sm leading-7 text-[var(--text-secondary)]">
          El sistema ha encontrado un error inesperado. Puedes intentarlo de nuevo o volver al dashboard.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-[var(--text-tertiary)]">ref: {error.digest}</p>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button onClick={reset} className={`${premiumPrimaryDarkButton} px-5`}>
          Reintentar
        </button>
        <NavigatingLink href="/dashboard" pendingLabel="Ir al dashboard" className={`${premiumSecondaryLightButton} px-5`}>
          Ir al dashboard
        </NavigatingLink>
      </div>
    </div>
  );
}
