'use client';

import { Node } from '@tiptap/core';
import {
  NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from '@tiptap/react';
import { PAGE_BREAK_HTML } from '@/lib/preview/page-breaks';

export const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      breakType: {
        default: 'manual',
        parseHTML: (element) => {
          const raw = element.getAttribute('data-page-break');
          if (raw === 'auto') return 'auto';
          return 'manual';
        },
        renderHTML: (attributes) => ({
          'data-page-break': attributes.breakType === 'auto' ? 'auto' : 'manual',
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'hr[data-page-break="manual"]',
      },
      {
        tag: 'hr[data-page-break="auto"]',
      },
      {
        tag: 'hr[data-page-break="true"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['hr', { 'data-page-break': 'manual', ...HTMLAttributes }];
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

export function PageBreakComponent({ node }: NodeViewProps) {
  const isAutoBreak = node.attrs.breakType === 'auto';

  if (isAutoBreak) {
    return (
      <NodeViewWrapper
        as="div"
        data-page-break-visual="auto"
        className="pointer-events-none h-0 overflow-hidden opacity-0"
      />
    );
  }

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
