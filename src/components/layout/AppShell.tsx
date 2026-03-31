import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { FolderOpen, LayoutDashboard, PenSquare, Sparkles } from 'lucide-react';

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f6f0e2_0%,_#efe8da_100%)] text-slate-950">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-4 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-[32px] border border-black/8 bg-white/85 p-6 shadow-[0_24px_80px_rgba(17,24,39,0.08)] backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-700 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-black">Anclora Talent</p>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Next Platform</p>
            </div>
          </div>

          <nav className="mt-8 space-y-2 text-sm font-semibold">
            <Link href="/dashboard" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-slate-700 transition hover:bg-slate-950 hover:text-white">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link href="/projects/new" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-slate-700 transition hover:bg-slate-950 hover:text-white">
              <PenSquare className="h-4 w-4" />
              Nuevo proyecto
            </Link>
            <Link href="/dashboard" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-slate-700 transition hover:bg-slate-950 hover:text-white">
              <FolderOpen className="h-4 w-4" />
              Mis proyectos
            </Link>
          </nav>

          <div className="mt-10 rounded-[28px] bg-slate-950 p-5 text-white">
            <p className="text-xs uppercase tracking-[0.2em] text-white/55">Infraestructura</p>
            <p className="mt-3 text-lg font-bold">Clerk + Neon + Blob</p>
            <p className="mt-3 text-sm leading-6 text-white/70">
              La cuenta individual es la unidad activa; el modelo mantiene `workspaceId` preparado
              para una futura evolución colaborativa.
            </p>
          </div>
        </aside>

        <div className="rounded-[36px] border border-black/8 bg-white/80 p-6 shadow-[0_24px_80px_rgba(17,24,39,0.08)] backdrop-blur xl:p-8">
          <header className="flex flex-col gap-4 border-b border-black/8 pb-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">App shell</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">Workspace editorial personal</h1>
            </div>
            <UserButton />
          </header>
          <div className="pt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
