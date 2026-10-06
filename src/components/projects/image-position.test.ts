import { describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { NodeSelection } from '@tiptap/pm/state';
import { closeHistory } from '@tiptap/pm/history';
import { ResizableImage } from './resizable-image-extension';
import {
  alignedFloatingX,
  clampFloatingPosition,
  moveSelectedImage,
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
    expect(String(attrs?.width)).toBe('220');
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
