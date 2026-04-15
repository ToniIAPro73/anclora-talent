'use client';

import { Node } from '@tiptap/core';
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

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-Enter': () => this.editor.commands.insertContent(PAGE_BREAK_HTML),
    };
  },
});
