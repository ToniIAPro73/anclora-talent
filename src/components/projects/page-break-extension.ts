'use client';

import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';

export const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  parseHTML() {
    return [
      {
        tag: 'div[data-type="page-break"]',
      },
    ];
  },

  renderHTML() {
    return ['div', { 'data-type': 'page-break', class: 'page-break-marker' }];
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-Enter': () => this.editor.commands.insertContent({ type: this.name }),
    };
  },
});

export function PageBreakComponent() {
  return (
    <div className="relative py-4 flex items-center gap-3 my-2">
      <div className="flex-1 h-px bg-[var(--border-strong)]" />
      <span className="text-xs text-[var(--text-tertiary)] font-semibold uppercase">
        Salto de Página
      </span>
      <div className="flex-1 h-px bg-[var(--border-strong)]" />
    </div>
  );
}
