import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PreviewCanvas } from '@/components/projects/PreviewCanvas';
import { premiumPrimaryDarkButton, premiumSecondaryLightButton } from '@/components/ui/button-styles';
import { requireUserId } from '@/lib/auth/guards';
import { projectRepository } from '@/lib/db/repositories';

export default async function ProjectPreviewPage({
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
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Preview</p>
          <h2 className="mt-2 text-4xl font-black tracking-tight">Validación de lectura y portada</h2>
        </div>
        <div className="flex gap-3">
          <Link href={`/projects/${project.id}/editor`} className={`${premiumSecondaryLightButton} px-5`}>
            Volver al editor
          </Link>
          <Link href={`/projects/${project.id}/cover`} className={`${premiumPrimaryDarkButton} px-5`}>
            Abrir cover studio
          </Link>
        </div>
      </div>
      <PreviewCanvas project={project} />
    </div>
  );
}
