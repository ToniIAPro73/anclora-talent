'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { premiumPrimaryDarkButton, premiumSecondaryLightButton } from '@/components/ui/button-styles';

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
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
          Error de proyecto
        </p>
        <h2 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">
          No se pudo cargar este proyecto
        </h2>
        <p className="max-w-md text-sm leading-7 text-[var(--text-secondary)]">
          Es posible que el proyecto haya sido eliminado o que haya ocurrido un error temporal.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-[var(--text-tertiary)]">ref: {error.digest}</p>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button onClick={reset} className={`${premiumPrimaryDarkButton} px-5`}>
          Reintentar
        </button>
        <Link href="/dashboard" className={`${premiumSecondaryLightButton} px-5`}>
          Volver al dashboard
        </Link>
      </div>
    </div>
  );
}
