import { Sparkles } from 'lucide-react';
import { navigationItems } from '../navigation';
import type { AppScreen } from '../types';

export function AppSidebar({
  currentScreen,
  onScreenChange,
}: {
  currentScreen: AppScreen;
  onScreenChange: (screen: AppScreen) => void;
}) {
  return (
    <aside className="fixed left-0 top-0 flex h-screen w-66 flex-col border-r border-panel-border bg-[#f5f1e7]/90 px-5 py-6 backdrop-blur">
      <div className="rounded-[28px] border border-panel-border bg-white px-5 py-5 shadow-[0_14px_50px_rgba(46,44,36,0.08)]">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-teal text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="font-headline text-lg font-black text-ink">Anclora Studio</p>
            <p className="text-xs uppercase tracking-[0.22em] text-muted">Editorial Lab</p>
          </div>
        </div>
        <p className="text-sm leading-6 text-muted">
          Base operativa para importar, editar, diseñar y exportar publicaciones digitales.
        </p>
      </div>

      <nav className="mt-6 flex-1 space-y-2">
        {navigationItems.map((item) => {
          const active = item.id === currentScreen;
          return (
            <button
              key={item.id}
              onClick={() => onScreenChange(item.id)}
              className={`w-full rounded-[24px] px-4 py-4 text-left transition ${
                active
                  ? 'bg-ink text-white shadow-[0_18px_48px_rgba(36,45,48,0.22)]'
                  : 'bg-transparent text-ink hover:bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <item.icon className={`mt-0.5 h-5 w-5 ${active ? 'text-brand-sand' : 'text-brand-teal'}`} />
                <div className="space-y-1">
                  <p className="font-headline text-sm font-bold">{item.label}</p>
                  <p className={`text-xs leading-5 ${active ? 'text-white/70' : 'text-muted'}`}>
                    {item.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </nav>

      <div className="rounded-[28px] bg-ink px-5 py-5 text-white">
        <p className="text-xs uppercase tracking-[0.2em] text-white/55">Siguiente hito</p>
        <p className="mt-2 font-headline text-lg font-bold">Modelo editorial canónico</p>
        <p className="mt-2 text-sm leading-6 text-white/70">
          Un solo documento fuente para editor, preview y exportación.
        </p>
      </div>
    </aside>
  );
}
