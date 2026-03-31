import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { ArrowRight, BookOpenText, Brush, LayoutDashboard, ShieldCheck } from 'lucide-react';

const platformPillars = [
  {
    title: 'Auth gestionada',
    detail: 'Clerk controla identidad, sesiones y protección de rutas.',
    icon: ShieldCheck,
  },
  {
    title: 'Documento canónico',
    detail: 'Editor y preview trabajan sobre el mismo modelo editorial.',
    icon: BookOpenText,
  },
  {
    title: 'Portadas persistentes',
    detail: 'Blob guarda assets y Neon conserva el estado del proyecto.',
    icon: Brush,
  },
];

export default async function HomePage() {
  const { userId } = await auth();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(31,113,108,0.18),_transparent_30%),linear-gradient(180deg,_#f8f3e8_0%,_#f2ede4_100%)] px-6 py-10 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl flex-col rounded-[40px] border border-black/8 bg-white/75 p-8 shadow-[0_30px_120px_rgba(33,37,41,0.10)] backdrop-blur xl:p-12">
        <header className="flex flex-col gap-6 border-b border-black/8 pb-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-teal-700">
              Anclora Talent
            </p>
            <h1 className="mt-4 max-w-4xl text-5xl font-black tracking-tight text-slate-950">
              Plataforma editorial preparada para autenticación, persistencia y producción real.
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
              El nuevo corte sobre Next.js sustituye la demo anterior y ya estructura el producto
              alrededor de usuarios, proyectos, documento, preview y portada.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {userId ? (
              <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700">
                Ir al dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
              <Link href="/sign-in" className="inline-flex items-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700">
                Entrar
              </Link>
              <Link href="/sign-up" className="inline-flex items-center rounded-full border border-black/10 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white">
                Crear cuenta
              </Link>
              </>
            )}
          </div>
        </header>

        <section className="grid flex-1 gap-8 pt-10 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-8">
            <div className="rounded-[32px] bg-slate-950 p-8 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                Vertical MVP
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] bg-white/8 p-5">
                  <p className="text-sm font-semibold text-teal-200">Flujo base</p>
                  <p className="mt-3 text-lg font-bold">Login → proyecto → editor → preview → portada</p>
                </div>
                <div className="rounded-[24px] bg-white/8 p-5">
                  <p className="text-sm font-semibold text-teal-200">Stack de plataforma</p>
                  <p className="mt-3 text-lg font-bold">Next.js + Clerk + Neon + Blob + Drizzle</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {platformPillars.map((pillar) => (
                <article key={pillar.title} className="rounded-[28px] border border-black/8 bg-white p-6">
                  <pillar.icon className="h-5 w-5 text-teal-700" />
                  <h2 className="mt-4 text-xl font-black">{pillar.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{pillar.detail}</p>
                </article>
              ))}
            </div>
          </div>

          <aside className="rounded-[32px] border border-black/8 bg-[#f7f2e7] p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Diseño de plataforma
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-tight">
              Base individual hoy, compatible con workspaces mañana.
            </h2>
            <ul className="mt-6 space-y-4 text-sm leading-7 text-slate-600">
              <li>El modelo reserva `workspaceId` nullable para evolución futura.</li>
              <li>La vertical activa se apoya en proyectos y propiedad individual por usuario Clerk.</li>
              <li>Neon conserva estructura relacional; Blob se reserva para imágenes y archivos.</li>
            </ul>
            <Link href="/dashboard" className="mt-8 inline-flex items-center gap-2 rounded-full border border-black/10 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:border-slate-950 hover:bg-white">
              <LayoutDashboard className="h-4 w-4" />
              Abrir dashboard
            </Link>
          </aside>
        </section>
      </div>
    </main>
  );
}
