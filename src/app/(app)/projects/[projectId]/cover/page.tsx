import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CoverForm } from '@/components/projects/CoverForm';
import { requireUserId } from '@/lib/auth/guards';
import { projectRepository } from '@/lib/db/repositories';

export default async function ProjectCoverPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const userId = await requireUserId();
  const { projectId } = await params;
  const project = await projectRepository.getProjectById(userId, projectId);

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Cover studio</p>
          <h2 className="mt-2 text-4xl font-black tracking-tight">Diseña y guarda la portada del proyecto</h2>
        </div>
        <div className="flex gap-3">
          <Link href={`/projects/${project.id}/editor`} className="inline-flex rounded-full border border-black/10 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white">
            Editor
          </Link>
          <Link href={`/projects/${project.id}/preview`} className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700">
            Preview
          </Link>
        </div>
      </div>
      <CoverForm project={project} />
    </div>
  );
}
