'use client';

import { Node } from '@tiptap/core';
import {
  NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from '@tiptap/react';
import { PAGE_BREAK_HTML } from '@/lib/preview/page-breaks';

const PAGE_BREAK_LAYOUT_STYLE = {
  breakAfter: 'column',
  pageBreakAfter: 'always',
  WebkitColumnBreakAfter: 'always',
} as const;

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
        className="pointer-events-none block h-0 overflow-hidden opacity-0"
        style={PAGE_BREAK_LAYOUT_STYLE}
      />
    );
  }

  return (
    <NodeViewWrapper
      as="div"
      data-page-break-visual="manual"
      className="relative my-2 block py-4"
      style={PAGE_BREAK_LAYOUT_STYLE}
    >
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--border-strong)]" />
        <span className="text-xs font-semibold uppercase text-[var(--text-tertiary)]">
          Salto de Página
        </span>
        <div className="h-px flex-1 bg-[var(--border-strong)]" />
      </div>
    </NodeViewWrapper>
  );
}
