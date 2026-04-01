import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { FolderOpen, LayoutDashboard, PenSquare, Sparkles } from 'lucide-react';

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.12),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.08),_transparent_24%),linear-gradient(180deg,_#09101d_0%,_#0b1220_48%,_#0e1729_100%)] text-white">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-5 px-4 py-4 lg:grid-cols-[280px_1fr]">
        <aside className="overflow-hidden rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.1),_transparent_30%),linear-gradient(180deg,_rgba(16,24,39,0.95)_0%,_rgba(8,14,27,0.98)_100%)] p-6 shadow-[0_28px_100px_rgba(2,6,23,0.42)] backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#07111f] text-[#8ce9de] shadow-[0_12px_30px_rgba(7,17,31,0.18)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-black text-white">Anclora Talent</p>
              <p className="text-xs uppercase tracking-[0.24em] text-white/45">Premium App</p>
            </div>
          </div>

          <div className="mt-8 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,_rgba(10,16,31,0.98)_0%,_rgba(5,9,18,1)_100%)] p-5 text-[#f8f4eb] shadow-[0_18px_40px_rgba(7,17,31,0.18)]">
            <p className="text-xs uppercase tracking-[0.22em] text-white/50">Contrato</p>
            <p className="mt-3 text-lg font-bold">Editorial workspace premium</p>
            <p className="mt-3 text-sm leading-6 text-white/72">
              Identidad protegida, persistencia real y una experiencia que mantiene el mismo nivel
              visual desde la entrada hasta la producción.
            </p>
          </div>

          <nav className="mt-8 space-y-2 text-sm font-semibold">
            <Link href="/dashboard" className="flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-white/72 transition hover:border-white/10 hover:bg-white/6 hover:text-white">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link href="/projects/new" className="flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-white/72 transition hover:border-white/10 hover:bg-white/6 hover:text-white">
              <PenSquare className="h-4 w-4" />
              Nuevo proyecto
            </Link>
            <Link href="/dashboard" className="flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-white/72 transition hover:border-white/10 hover:bg-white/6 hover:text-white">
              <FolderOpen className="h-4 w-4" />
              Mis proyectos
            </Link>
          </nav>

          <div className="mt-10 rounded-[28px] border border-white/10 bg-white/4 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-white/45">Stack activo</p>
            <p className="mt-3 text-lg font-bold text-white">Clerk + Neon + Blob</p>
            <p className="mt-3 text-sm leading-6 text-white/62">
              La cuenta individual sigue siendo la unidad activa, pero la experiencia ya se presenta
              como producto premium, no como shell técnico.
            </p>
          </div>
        </aside>

        <div className="rounded-[40px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.08),_transparent_30%),linear-gradient(180deg,_rgba(14,23,41,0.96)_0%,_rgba(8,14,27,0.98)_100%)] p-6 shadow-[0_28px_100px_rgba(2,6,23,0.42)] backdrop-blur xl:p-8">
          <header className="flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/45">App shell</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Workspace editorial personal</h1>
            </div>
            <div className="rounded-full border border-white/10 bg-white/6 px-2 py-1 shadow-[0_10px_24px_rgba(17,24,39,0.06)]">
              <UserButton />
            </div>
          </header>
          <div className="pt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
