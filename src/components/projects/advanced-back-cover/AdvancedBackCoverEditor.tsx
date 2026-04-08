'use client';

import { AdvancedSurfaceEditor } from '../advanced-cover/AdvancedSurfaceEditor';
import type { ProjectRecord } from '@/lib/projects/types';
import type { AppMessages } from '@/lib/i18n/messages';

export function AdvancedBackCoverEditor({
  project,
  copy,
}: {
  project: ProjectRecord;
  copy: AppMessages['project'];
}) {
  return <AdvancedSurfaceEditor surface="back-cover" project={project} copy={copy} />;
}
