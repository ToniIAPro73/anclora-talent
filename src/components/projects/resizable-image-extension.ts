'use client';

import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ImageNodeView } from './image-node-view';

const num = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const ResizableImage = Image.extend({
  // Selected images can be dragged between blocks (inline reorder); floating
  // images are moved through the node view's own pointer handling.
  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-width'),
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
        parseHTML: (element) => element.getAttribute('data-height'),
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

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});
