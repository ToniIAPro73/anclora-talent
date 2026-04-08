'use client';

import { Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { PAGE_BREAK_HTML } from '@/lib/preview/page-breaks';

export const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  parseHTML() {
    return [
      {
        tag: 'hr[data-page-break="true"]',
      },
    ];
  },

  renderHTML() {
    return ['hr', { 'data-page-break': 'true' }];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageBreakComponent);
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-Enter': () => this.editor.commands.insertContent(PAGE_BREAK_HTML),
    };
  },
});

export function PageBreakComponent() {
  return (
    <NodeViewWrapper as="div" className="relative my-2 flex items-center gap-3 py-4">
      <div className="flex-1 h-px bg-[var(--border-strong)]" />
      <span className="text-xs text-[var(--text-tertiary)] font-semibold uppercase">
        Salto de Página
      </span>
      <div className="flex-1 h-px bg-[var(--border-strong)]" />
    </NodeViewWrapper>
  );
}
