import Link from 'next/link';
import { CreateProjectForm } from '@/components/projects/CreateProjectForm';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { requireUserId } from '@/lib/auth/guards';
import { projectRepository } from '@/lib/db/repositories';

export default async function DashboardPage() {
  const userId = await requireUserId();
  const projects = await projectRepository.listProjectsForUser(userId);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[28px] bg-slate-950 p-8 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/55">Dashboard</p>
          <h2 className="mt-4 text-4xl font-black tracking-tight">Tus proyectos editoriales ya viven sobre una plataforma persistente.</h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-white/70">
            Auth, documento, preview y portada ya están alineados. El siguiente trabajo productivo es conectar importación y exportación sobre esta misma base.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/projects/new" className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-200">
              Crear nuevo proyecto
            </Link>
          </div>
        </div>
        <CreateProjectForm />
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Mis proyectos</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight">Base editorial individual</h2>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </section>
    </div>
  );
}
