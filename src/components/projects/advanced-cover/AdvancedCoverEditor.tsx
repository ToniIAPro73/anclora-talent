'use client';

import { AdvancedSurfaceEditor } from './AdvancedSurfaceEditor';
import type { ProjectRecord } from '@/lib/projects/types';
import type { AppMessages } from '@/lib/i18n/messages';

export function AdvancedCoverEditor({
  project,
  copy,
}: {
  project: ProjectRecord;
  copy: AppMessages['project'];
}) {
  return <AdvancedSurfaceEditor surface="cover" project={project} copy={copy} />;
}
