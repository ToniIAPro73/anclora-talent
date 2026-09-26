import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

/**
 * Setting `style.position`/`top`/`left` directly on a footnote paragraph's
 * DOM node (the earlier approach) is invisible to ProseMirror: it owns that
 * DOM and can rebuild or patch it on any later transaction without ever
 * looking at attributes it didn't itself apply, silently discarding the
 * mutation — which is why footnotes kept reappearing inline after the very
 * next edit or chapter navigation. Decorations are the supported channel
 * for exactly this: presentational-only styling that ProseMirror itself
 * renders and preserves across transactions, as long as it isn't touching
 * that node's content.
 */
export interface FootnoteDecorationInput {
  pos: number;
  nodeSize: number;
  style: string;
}

export const footnoteLayoutPluginKey = new PluginKey<DecorationSet>('footnoteLayout');

export const FootnoteLayout = Extension.create({
  name: 'footnoteLayout',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: footnoteLayoutPluginKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, old) {
            const meta = tr.getMeta(footnoteLayoutPluginKey) as FootnoteDecorationInput[] | undefined;
            if (meta) {
              return DecorationSet.create(
                tr.doc,
                meta.map((item) => Decoration.node(item.pos, item.pos + item.nodeSize, { style: item.style })),
              );
            }
            return old.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return footnoteLayoutPluginKey.getState(state) ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});

/**
 * Dispatches the given footnote layout as decorations. Passing `[]` clears
 * all of them, returning affected footnotes to normal document flow so
 * their natural (in-flow) position can be measured on the next pass.
 */
export function setFootnoteDecorations(
  view: { state: { tr: import('@tiptap/pm/state').Transaction }; dispatch: (tr: import('@tiptap/pm/state').Transaction) => void },
  items: FootnoteDecorationInput[],
): void {
  const tr = view.state.tr.setMeta(footnoteLayoutPluginKey, items);
  // Purely presentational — must never show up in undo history or trigger
  // the "unsaved changes" content-update path.
  tr.setMeta('addToHistory', false);
  view.dispatch(tr);
}
