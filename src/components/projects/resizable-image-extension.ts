'use client';

import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { Plugin, Selection, TextSelection } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/core';
import { ImageNodeView } from './image-node-view';

/** data-width/data-height round-trip as strings; keep numeric sizes numeric. */
const sizeFromAttribute = (value: string | null): number | string | null => {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
};

const num = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

type ImageNodeSelection = { node?: { type: { name: string }; nodeSize: number }; from: number; to: number };

/**
 * Image NodeSelection -> TextSelection around the image. Gives the user a real
 * caret before/after the image (creating an empty paragraph when the image is
 * the first/last block) instead of a dead node selection.
 */
export function moveCaretAroundImage(editor: Editor, side: 'before' | 'after'): boolean {
  const { state, view } = editor;
  const selection = state.selection as unknown as ImageNodeSelection;
  if (selection.node?.type.name !== 'image') return false;

  const paragraph = state.schema.nodes.paragraph;
  const tr = state.tr;
  let target: number;
  if (side === 'after') {
    target = selection.to;
    if (target >= state.doc.content.size || !state.doc.resolve(target).nodeAfter?.isTextblock) {
      tr.insert(target, paragraph.create());
    }
    tr.setSelection(Selection.near(tr.doc.resolve(target), 1));
  } else {
    target = selection.from;
    if (!state.doc.resolve(target).nodeBefore?.isTextblock) {
      tr.insert(target, paragraph.create());
      tr.setSelection(TextSelection.create(tr.doc, target + 1));
    } else {
      tr.setSelection(Selection.near(tr.doc.resolve(target), -1));
    }
  }
  view.dispatch(tr.scrollIntoView());
  return true;
}

export const ResizableImage = Image.extend({
  // Selected images can be dragged between blocks (inline reorder); floating
  // images are moved through the node view's own pointer handling.
  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => sizeFromAttribute(element.getAttribute('data-width')),
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return {
            'data-width': attributes.width,
            style: `width: ${typeof attributes.width === 'number' ? attributes.width + 'px' : attributes.width}`,
          };
        },
      },
      height: {
        default: null,
        parseHTML: (element) => sizeFromAttribute(element.getAttribute('data-height')),
        renderHTML: (attributes) => {
          if (!attributes.height) return {};
          return {
            'data-height': attributes.height,
            style: `height: ${typeof attributes.height === 'number' ? attributes.height + 'px' : attributes.height}`,
          };
        },
      },
      // mode: 'inline' keeps the image in the document flow; 'floating' keeps it
      // anchored to its block and offsets it by (x, y) from that anchor.
      mode: {
        default: 'inline',
        parseHTML: (element) =>
          element.getAttribute('data-mode') === 'floating' ? 'floating' : 'inline',
        renderHTML: (attributes) => {
          if (attributes.mode !== 'floating') return { 'data-mode': 'inline' };
          return {
            'data-mode': 'floating',
            style: `position: relative; left: ${num(attributes.x)}px; top: ${num(attributes.y)}px; z-index: 1`,
          };
        },
      },
      anchor: {
        default: 'block',
        parseHTML: (element) => element.getAttribute('data-anchor') || 'block',
        renderHTML: (attributes) => ({ 'data-anchor': attributes.anchor || 'block' }),
      },
      x: {
        default: 0,
        parseHTML: (element) => num(element.getAttribute('data-x')),
        renderHTML: (attributes) => (attributes.mode === 'floating' ? { 'data-x': String(num(attributes.x)) } : {}),
      },
      y: {
        default: 0,
        parseHTML: (element) => num(element.getAttribute('data-y')),
        renderHTML: (attributes) => (attributes.mode === 'floating' ? { 'data-y': String(num(attributes.y)) } : {}),
      },
      // Text wrapping is not implemented yet; 'none' is the only supported value.
      wrap: {
        default: 'none',
        parseHTML: (element) => element.getAttribute('data-wrap') || 'none',
        renderHTML: (attributes) => (attributes.mode === 'floating' ? { 'data-wrap': attributes.wrap || 'none' } : {}),
      },
      align: {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-align') || 'center',
        renderHTML: (attributes) => {
          return {
            'data-align': attributes.align,
          };
        },
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => moveCaretAroundImage(this.editor, 'after'),
      ArrowDown: () => moveCaretAroundImage(this.editor, 'after'),
      ArrowRight: () => moveCaretAroundImage(this.editor, 'after'),
      ArrowUp: () => moveCaretAroundImage(this.editor, 'before'),
      ArrowLeft: () => moveCaretAroundImage(this.editor, 'before'),
    };
  },

  onCreate() {
    // appendTransaction only sees later transactions; cover the initial doc.
    const { state, view } = this.editor;
    const last = state.doc.lastChild;
    if (last?.type.name === 'image') {
      view.dispatch(
        state.tr.insert(state.doc.content.size, state.schema.nodes.paragraph.create()).setMeta('addToHistory', false),
      );
    }
  },

  addProseMirrorPlugins() {
    return [
      ...(this.parent?.() ?? []),
      // A chapter that ends with an image always keeps an empty paragraph
      // after it, so there is a real place to click and keep typing.
      new Plugin({
        appendTransaction(_transactions, _oldState, newState) {
          const last = newState.doc.lastChild;
          if (!last || last.type.name !== 'image') return null;
          return newState.tr.insert(newState.doc.content.size, newState.schema.nodes.paragraph.create());
        },
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});
