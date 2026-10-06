import { describe, expect, it, vi } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import { closeHistory } from '@tiptap/pm/history';
import { ResizableImage, moveCaretAroundImage } from './resizable-image-extension';
import {
  alignedFloatingX,
  clampFloatingPosition,
  columnIndexAt,
  moveSelectedImage,
  pageCrossingFor,
  reanchorImageAcrossPages,
  type FloatingBox,
} from './image-position';

// The React node view needs a mounted React tree; attrs/commands do not.
const HeadlessImage = ResizableImage.extend({ addNodeView: undefined });

function makeEditor(html: string) {
  return new Editor({ extensions: [StarterKit, HeadlessImage.configure({ allowBase64: true })], content: html });
}

function imagePos(editor: Editor): number {
  let pos = -1;
  editor.state.doc.descendants((node, p) => {
    if (node.type.name === 'image') pos = p;
    return true;
  });
  return pos;
}

function order(editor: Editor): string[] {
  return (editor.getJSON().content ?? []).map((n) => n.type ?? '');
}

const SRC = 'data:image/png;base64,AAAA';
const box: FloatingBox = {
  containerWidth: 600,
  containerHeight: 400,
  width: 200,
  height: 100,
  naturalLeft: 40,
  naturalTop: 100,
};

describe('floating image position', () => {
  it('clamps inside the editable area so the image cannot vanish', () => {
    expect(clampFloatingPosition(-500, -500, box)).toEqual({ x: -40, y: -100 });
    expect(clampFloatingPosition(5000, 5000, box)).toEqual({ x: 360, y: 200 });
    expect(clampFloatingPosition(10, 20, box)).toEqual({ x: 10, y: 20 });
  });

  it('alignment sets only the initial x offset', () => {
    expect(alignedFloatingX('left', box)).toBe(-40);
    expect(alignedFloatingX('center', box)).toBe(160);
    expect(alignedFloatingX('right', box)).toBe(360);
  });
});

describe('image node attrs', () => {
  it('persists mode, anchor, x, y, size, align and wrap through HTML', () => {
    const editor = makeEditor(`<p>a</p><img src="${SRC}">`);
    editor.commands.setNodeSelection(imagePos(editor));
    editor.commands.updateAttributes('image', {
      mode: 'floating', x: 42, y: -7, width: 220, height: 110, align: 'right',
    });
    const html = editor.getHTML();
    expect(html).toContain('data-mode="floating"');
    expect(html).toContain('data-x="42"');
    expect(html).toContain('data-y="-7"');
    expect(html).toContain('data-anchor="block"');
    expect(html).toContain('left: 42px');

    const reloaded = makeEditor(html);
    const attrs = reloaded.getJSON().content?.find((n) => n.type === 'image')?.attrs;
    expect(attrs).toMatchObject({ mode: 'floating', x: 42, y: -7, anchor: 'block', align: 'right' });
    // sizes stay numeric across the HTML round trip (a string width collapsed the node view)
    expect(attrs?.width).toBe(220);
    expect(attrs?.height).toBe(110);
    editor.destroy();
    reloaded.destroy();
  });

  it('inline images (legacy HTML) default to in-flow without offsets', () => {
    const editor = makeEditor(`<img src="${SRC}" data-align="left">`);
    const attrs = editor.getJSON().content?.find((n) => n.type === 'image')?.attrs;
    expect(attrs).toMatchObject({ mode: 'inline', x: 0, y: 0, align: 'left' });
    expect(editor.getHTML()).not.toContain('data-x');
    editor.destroy();
  });
});

describe('inline reorder and undo', () => {
  it('moves the image between blocks keeping its attrs, and undo restores the slot', () => {
    const editor = makeEditor(`<p>uno</p><img src="${SRC}" data-width="180" data-align="left"><p>dos</p>`);
    const before = order(editor);
    expect(before).toEqual(['paragraph', 'image', 'paragraph']);

    editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, imagePos(editor))));
    expect(moveSelectedImage(editor, -1)).toBe(true);
    expect(order(editor)).toEqual(['image', 'paragraph', 'paragraph']);
    const moved = editor.getJSON().content?.[0]?.attrs;
    expect(moved).toMatchObject({ src: SRC, align: 'left' });
    expect(String(moved?.width)).toBe('180');

    editor.commands.undo();
    expect(order(editor)).toEqual(before);
    editor.commands.redo();
    expect(order(editor)).toEqual(['image', 'paragraph', 'paragraph']);
    editor.destroy();
  });

  it('does nothing at the document edges', () => {
    const editor = makeEditor(`<img src="${SRC}"><p>x</p>`);
    editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, imagePos(editor))));
    expect(moveSelectedImage(editor, -1)).toBe(false);
    editor.destroy();
  });

  it('move and resize are single undoable steps', () => {
    const editor = makeEditor(`<p>x</p><img src="${SRC}" data-width="100" data-height="50">`);
    editor.commands.setNodeSelection(imagePos(editor));
    // Gestures are separated in time in the UI; close the history group like that.
    const gesture = (attrs: Record<string, unknown>) => {
      editor.view.dispatch(closeHistory(editor.state.tr));
      editor.commands.updateAttributes('image', attrs);
    };
    gesture({ mode: 'floating', x: 0, y: 0 });
    gesture({ x: 30, y: 20 });
    gesture({ width: 300, height: 150 });
    editor.commands.undo();
    expect(editor.getJSON().content?.[1]?.attrs).toMatchObject({ x: 30, y: 20 });
    editor.commands.undo();
    expect(editor.getJSON().content?.[1]?.attrs).toMatchObject({ x: 0, y: 0 });
    editor.commands.redo();
    expect(editor.getJSON().content?.[1]?.attrs).toMatchObject({ x: 30, y: 20 });
    editor.destroy();
  });
});

describe('page-column geometry', () => {
  it('resolves the page column from the flow-relative x', () => {
    expect(columnIndexAt(0, 700)).toBe(0);
    expect(columnIndexAt(698, 700)).toBe(0);
    expect(columnIndexAt(700, 700)).toBe(1);
    expect(columnIndexAt(1500, 700)).toBe(2);
  });

  it('bounds an image on page 3 inside its own column instead of snapping to page 1', () => {
    // naturalLeft is per column now: an image on any page behaves like page 1.
    const pageThree = { ...box, naturalLeft: 40 };
    expect(clampFloatingPosition(10, 20, pageThree)).toEqual({ x: 10, y: 20 });
    expect(clampFloatingPosition(5000, 0, pageThree).x).toBe(360);
  });

  it('requests a page change only when dragged well past the column edge', () => {
    expect(pageCrossingFor(0, 0, box)).toBe(0);
    expect(pageCrossingFor(0, 210, box)).toBe(0); // touches the bottom edge
    expect(pageCrossingFor(0, 260, box)).toBe(1);
    expect(pageCrossingFor(0, -140, box)).toBe(-1);
    expect(pageCrossingFor(500, 0, box)).toBe(1);
  });
});

describe('positioned drag isolation', () => {
  it('changes only image attrs; sibling blocks stay identical', () => {
    const editor = makeEditor(`<p>uno</p><img src="${SRC}"><p>dos</p>`);
    const siblingsBefore = JSON.stringify((editor.getJSON().content ?? []).filter((n) => n.type !== 'image'));
    editor.commands.setNodeSelection(imagePos(editor));
    editor.commands.updateAttributes('image', { mode: 'floating', x: 120, y: 80 });
    const content = editor.getJSON().content ?? [];
    expect(content.map((n) => n.type)).toEqual(['paragraph', 'image', 'paragraph']);
    expect(JSON.stringify(content.filter((n) => n.type !== 'image'))).toBe(siblingsBefore);
    expect(content[1].attrs).toMatchObject({ mode: 'floating', x: 120, y: 80 });
    editor.destroy();
  });
});

describe('cross-page re-anchor', () => {
  function layoutEditor(columns: number[]) {
    // jsdom has no layout: fake each top-level block's first client rect.
    const editor = makeEditor(`<p>a</p><p>b</p><img src="${SRC}"><p>c</p><p>d</p>`);
    const dom = new Map<number, { getClientRects: () => Array<{ left: number }> }>();
    let index = 0;
    editor.state.doc.forEach((_node, offset) => {
      const left = columns[index] * 700;
      dom.set(offset, { getClientRects: () => [{ left }] });
      index += 1;
    });
    vi.spyOn(editor.view, 'nodeDOM').mockImplementation((pos: number) => (dom.get(pos) ?? null) as unknown as Node);
    return editor;
  }

  it('moves the image to the top of the next page in one transaction', () => {
    // a,b,image on page 1; c,d on page 2
    const editor = layoutEditor([0, 0, 0, 1, 1]);
    editor.commands.setNodeSelection(imagePos(editor));
    editor.commands.updateAttributes('image', { mode: 'floating', x: 30, y: 90 });
    expect(reanchorImageAcrossPages(editor, 1, { stride: 700, flowLeft: 0, currentColumn: 0 })).toBe(true);

    expect(order(editor)).toEqual(['paragraph', 'paragraph', 'paragraph', 'image', 'paragraph']);
    // offsets reset: the image sits at the top-left of its new page
    expect(editor.getJSON().content?.[3]?.attrs).toMatchObject({ mode: 'floating', x: 0, y: 0 });
    const sel = editor.state.selection as unknown as { node?: { type: { name: string } } };
    expect(sel.node?.type.name).toBe('image');
    editor.destroy();
  });

  it('lands at the end of the document when the next page has no content yet', () => {
    const editor = layoutEditor([0, 0, 0, 0, 0]);
    editor.commands.setNodeSelection(imagePos(editor));
    expect(reanchorImageAcrossPages(editor, 1, { stride: 700, flowLeft: 0, currentColumn: 0 })).toBe(true);
    // image moved last; the trailing-paragraph guard keeps a place to type
    expect(order(editor).slice(-2)).toEqual(['image', 'paragraph']);
    editor.destroy();
  });

  it('refuses to go before the first page', () => {
    const editor = layoutEditor([0, 0, 0, 1, 1]);
    editor.commands.setNodeSelection(imagePos(editor));
    expect(reanchorImageAcrossPages(editor, -1, { stride: 700, flowLeft: 0, currentColumn: 0 })).toBe(false);
    editor.destroy();
  });
});

describe('caret around image', () => {
  it('keeps a paragraph after a trailing image so there is somewhere to type', async () => {
    const editor = makeEditor(`<p>uno</p><img src="${SRC}">`);
    await new Promise((resolve) => setTimeout(resolve, 0)); // TipTap emits `create` asynchronously
    expect(order(editor)).toEqual(['paragraph', 'image', 'paragraph']);
    editor.destroy();
  });

  it('NodeSelection(image) -> TextSelection after the image, typing lands after it', () => {
    const editor = makeEditor(`<p>uno</p><img src="${SRC}"><p>dos</p>`);
    const imageAt = imagePos(editor);
    editor.commands.setNodeSelection(imageAt);
    expect(moveCaretAroundImage(editor, 'after')).toBe(true);
    expect(editor.state.selection instanceof TextSelection).toBe(true);
    expect(editor.state.selection.from).toBeGreaterThan(imageAt);
    editor.commands.insertContent('Texto después de imagen');
    const blocks = editor.getJSON().content ?? [];
    expect(blocks.map((n) => n.type)).toEqual(['paragraph', 'image', 'paragraph']);
    expect(JSON.stringify(blocks[2])).toContain('Texto después de imagen');
    editor.destroy();
  });

  it('creates the paragraph before an image that is the first block', () => {
    const editor = makeEditor(`<img src="${SRC}"><p>dos</p>`);
    editor.commands.setNodeSelection(imagePos(editor));
    expect(moveCaretAroundImage(editor, 'before')).toBe(true);
    expect(order(editor)[0]).toBe('paragraph');
    expect(editor.state.selection instanceof TextSelection).toBe(true);
    expect(editor.state.selection.from).toBeLessThan(imagePos(editor));
    editor.destroy();
  });

  it('does nothing when the selection is plain text', () => {
    const editor = makeEditor(`<p>uno</p><img src="${SRC}">`);
    editor.commands.setTextSelection(2);
    expect(moveCaretAroundImage(editor, 'after')).toBe(false);
    editor.destroy();
  });
});
