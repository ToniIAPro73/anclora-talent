import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { FolderOpen, LayoutDashboard, PenSquare, Sparkles } from 'lucide-react';

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(13,148,136,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(180,83,9,0.1),_transparent_24%),linear-gradient(180deg,_#f8f4eb_0%,_#ece4d6_100%)] text-slate-950">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-5 px-4 py-4 lg:grid-cols-[280px_1fr]">
        <aside className="overflow-hidden rounded-[36px] border border-black/8 bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.14),_transparent_30%),linear-gradient(180deg,_rgba(255,255,255,0.88)_0%,_rgba(250,246,238,0.98)_100%)] p-6 shadow-[0_28px_100px_rgba(17,24,39,0.1)] backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#07111f] text-[#8ce9de] shadow-[0_12px_30px_rgba(7,17,31,0.18)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-black">Anclora Talent</p>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Premium App</p>
            </div>
          </div>

          <div className="mt-8 rounded-[28px] border border-black/8 bg-[#07111f] p-5 text-[#f8f4eb] shadow-[0_18px_40px_rgba(7,17,31,0.18)]">
            <p className="text-xs uppercase tracking-[0.22em] text-white/50">Contrato</p>
            <p className="mt-3 text-lg font-bold">Editorial workspace premium</p>
            <p className="mt-3 text-sm leading-6 text-white/72">
              Identidad protegida, persistencia real y una experiencia que mantiene el mismo nivel
              visual desde la entrada hasta la producción.
            </p>
          </div>

          <nav className="mt-8 space-y-2 text-sm font-semibold">
            <Link href="/dashboard" className="flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-slate-700 transition hover:border-black/8 hover:bg-white hover:text-slate-950">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link href="/projects/new" className="flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-slate-700 transition hover:border-black/8 hover:bg-white hover:text-slate-950">
              <PenSquare className="h-4 w-4" />
              Nuevo proyecto
            </Link>
            <Link href="/dashboard" className="flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-slate-700 transition hover:border-black/8 hover:bg-white hover:text-slate-950">
              <FolderOpen className="h-4 w-4" />
              Mis proyectos
            </Link>
          </nav>

          <div className="mt-10 rounded-[28px] border border-black/8 bg-white/78 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Stack activo</p>
            <p className="mt-3 text-lg font-bold text-slate-950">Clerk + Neon + Blob</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              La cuenta individual sigue siendo la unidad activa, pero la experiencia ya se presenta
              como producto premium, no como shell técnico.
            </p>
          </div>
        </aside>

        <div className="rounded-[40px] border border-black/8 bg-[linear-gradient(180deg,_rgba(255,255,255,0.86)_0%,_rgba(255,252,247,0.96)_100%)] p-6 shadow-[0_28px_100px_rgba(17,24,39,0.1)] backdrop-blur xl:p-8">
          <header className="flex flex-col gap-4 border-b border-black/8 pb-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">App shell</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Workspace editorial personal</h1>
            </div>
            <div className="rounded-full border border-black/8 bg-white/84 px-2 py-1 shadow-[0_10px_24px_rgba(17,24,39,0.06)]">
              <UserButton />
            </div>
          </header>
          <div className="pt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
