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
    <div className="flex justify-center items-center min-h-[400px]">
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[var(--button-primary-border)] bg-[var(--button-primary-bg)] px-8 py-3 text-base font-bold !text-[var(--button-primary-fg)] shadow-[var(--shadow-soft)] transition hover:bg-[var(--button-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-primary-bg)] focus-visible:ring-offset-2"
      >
        <BookOpen className="h-5 w-5" />
        Open Full Preview
      </button>
    </div>
  );
}
