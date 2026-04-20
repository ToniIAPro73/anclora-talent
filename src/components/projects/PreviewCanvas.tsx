'use client';

/**
 * Preview Canvas - Anclora Talent Premium Edition
 * Simple component that renders a button to open the full-screen preview modal
 *
 * This replaces the previous embedded preview with a proper modal dialog
 */

import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import type { ProjectRecord } from '@/lib/projects/types';
import type { AppMessages } from '@/lib/i18n/messages';
import { PreviewModal } from './PreviewModal';

export function PreviewCanvas({
  copy,
  project,
}: {
  copy: AppMessages['project'];
  project: ProjectRecord;
}) {
  const [showModal, setShowModal] = useState(false);

  // Show modal when requested
  if (showModal) {
    return (
      <PreviewModal
        project={project}
        copy={copy}
        onClose={() => setShowModal(false)}
      />
    );
  }

  // Return simple button to open the modal
  return (
    <div className="ac-surface-panel ac-surface-panel--subtle flex min-h-[400px] items-center justify-center p-8">
      <button
        onClick={() => setShowModal(true)}
        className="ac-button ac-button--primary"
      >
        <BookOpen className="h-5 w-5" />
        Open Full Preview
      </button>
    </div>
  );
}
