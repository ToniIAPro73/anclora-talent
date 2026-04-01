import Link from 'next/link';
import { CreateProjectForm } from '@/components/projects/CreateProjectForm';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { premiumPrimaryDarkButton, premiumPrimaryMintButton } from '@/components/ui/button-styles';
import { requireUserId } from '@/lib/auth/guards';
import { loadDashboardData } from './dashboard-data';

export default async function DashboardPage() {
  const userId = await requireUserId();
  const { projects, dataAvailable } = await loadDashboardData(userId);
  const hasProjects = projects.length > 0;

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.14),_transparent_30%),linear-gradient(180deg,_#111a2b_0%,_#0b1220_100%)] p-8 text-white shadow-[0_24px_80px_rgba(15,23,42,0.34)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/55">Dashboard premium</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight sm:text-5xl">
            Tus proyectos editoriales ya viven dentro de una app que parece producto de verdad.
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-8 text-white/72">
            Auth, documento, preview y portada ya están alineados. Ahora el acceso diario también
            tiene que transmitir valor, control y acabado premium.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/projects/new" className={`${premiumPrimaryMintButton} px-5`}>
              Crear nuevo proyecto
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-white/7 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-white/50">Proyectos</p>
              <p className="mt-3 text-2xl font-black text-white">{projects.length}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/7 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-white/50">Estado</p>
              <p className="mt-3 text-sm font-semibold text-white/92">
                {dataAvailable
                  ? hasProjects
                    ? 'Base activa y persistente'
                    : 'Listo para primer proyecto'
                  : 'Fallback operativo activo'}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/7 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-white/50">Contrato</p>
              <p className="mt-3 text-sm font-semibold text-white/92">
                {dataAvailable ? 'Premium app operativa' : 'Acceso sin caída ante fallo de datos'}
              </p>
            </div>
          </div>
        </div>
        <CreateProjectForm />
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/45">Mis proyectos</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Base editorial individual</h2>
        </div>
        {hasProjects ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="rounded-[32px] border border-dashed border-white/12 bg-[linear-gradient(180deg,_rgba(255,255,255,0.04)_0%,_rgba(255,255,255,0.02)_100%)] p-8 shadow-[0_18px_60px_rgba(17,24,39,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">
              {dataAvailable ? 'Estado inicial' : 'Modo degradado'}
            </p>
            <h3 className="mt-3 text-2xl font-black tracking-tight text-white">
              {dataAvailable
                ? 'Aún no hay proyectos, pero el workspace ya está listo para abrir el primero.'
                : 'El dashboard sigue accesible aunque la lectura de proyectos haya fallado.'}
            </h3>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/68">
              {dataAvailable
                ? 'La experiencia premium no empieza cuando ya hay contenido. Empieza cuando el sistema te invita a crear con claridad desde el minuto uno.'
                : 'Puedes seguir creando un proyecto nuevo mientras se recupera la capa de datos. Esto evita que la navegación principal termine en error 500.'}
            </p>
            <Link href="/projects/new" className={`mt-6 ${premiumPrimaryDarkButton} min-h-11 px-5`}>
              Crear el primer proyecto
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
