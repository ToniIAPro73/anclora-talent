'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, Heading2, Quote, List, ListOrdered, Undo, Redo } from 'lucide-react';

const DEBOUNCE_MS = 800;

type ToolbarButtonProps = {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  dataTestId: string;
  title: string;
  children: React.ReactNode;
};

function ToolbarButton({ onClick, active, disabled, dataTestId, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={dataTestId}
      title={title}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-mint)] disabled:pointer-events-none disabled:opacity-40 ${
        active
          ? 'bg-[var(--button-highlight-bg)] text-[var(--button-highlight-fg)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-highlight)] hover:text-[var(--text-primary)]'
      }`}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  defaultContent,
  onUpdate,
}: {
  defaultContent: string;
  onUpdate: (html: string) => void;
}) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleUpdate = useCallback(
    (html: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onUpdate(html), DEBOUNCE_MS);
    },
    [onUpdate],
  );

  const editor = useEditor({
    extensions: [StarterKit],
    content: defaultContent,
    onUpdate: ({ editor: ed }: { editor: any }) => {
      handleUpdate(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'max-w-none min-h-[240px] p-5 focus:outline-none text-[var(--text-primary)] [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--accent-mint)] [&_blockquote]:pl-4 [&_blockquote]:text-[var(--text-secondary)] [&_h1]:text-2xl [&_h1]:font-black [&_h2]:text-xl [&_h2]:font-black [&_h3]:text-lg [&_h3]:font-bold [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:leading-7 [&_ul]:list-disc [&_ul]:pl-6',
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (!editor) return null;

  return (
    <div
      className="overflow-hidden rounded-[24px] border border-[var(--border-subtle)] bg-[var(--page-surface)]"
      data-testid="rich-text-editor"
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-[var(--border-subtle)] bg-[var(--surface-soft)] px-3 py-2">
        <ToolbarButton
          dataTestId="editor-toolbar-bold-button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          dataTestId="editor-toolbar-italic-button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="mx-1 h-4 w-px bg-[var(--border-subtle)]" />
        <ToolbarButton
          dataTestId="editor-toolbar-heading-button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading"
        >
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          dataTestId="editor-toolbar-quote-button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Quote"
        >
          <Quote className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="mx-1 h-4 w-px bg-[var(--border-subtle)]" />
        <ToolbarButton
          dataTestId="editor-toolbar-bullet-list-button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet list"
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          dataTestId="editor-toolbar-ordered-list-button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Ordered list"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="ml-auto flex gap-1">
          <ToolbarButton
            dataTestId="editor-toolbar-undo-button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            dataTestId="editor-toolbar-redo-button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo className="h-3.5 w-3.5" />
          </ToolbarButton>
        </div>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
