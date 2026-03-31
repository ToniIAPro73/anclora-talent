import { Moon, Search, Sun } from 'lucide-react';
import type { ThemeMode } from '../types';

export function AppTopbar({
  theme,
  onThemeChange,
}: {
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
}) {
  return (
    <header className="fixed left-72 right-0 top-0 z-20 flex h-20 items-center justify-between border-b border-panel-border bg-app/85 px-6 backdrop-blur-xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">Estado del producto</p>
        <p className="font-headline text-2xl font-black tracking-tight text-ink">
          Plataforma editorial moderna, ágil y eficaz
        </p>
      </div>

      <div className="flex items-center gap-3">
        <label className="hidden items-center gap-2 rounded-full border border-panel-border bg-white px-4 py-2 md:flex">
          <Search className="h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Buscar feature, flujo o documento"
            className="w-72 bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </label>
        <button
          onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-panel-border bg-white text-ink transition hover:bg-ink hover:text-white"
          aria-label="Cambiar tema"
        >
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}
