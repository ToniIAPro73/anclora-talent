'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Undo2,
  Redo2,
  Strikethrough
} from 'lucide-react';

const DEBOUNCE_MS = 800;

type ToolbarButtonProps = {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
};

function ToolbarButton({ onClick, active, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
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

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3">
      {/* Font Family Selection */}
      <div className="flex items-center gap-2 pr-2 border-r border-[var(--border-subtle)]">
        <label className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
          Fuente
        </label>
        <select
          onChange={(e) => {
            const fontName = e.target.value;
            if (fontName === 'reset') {
              editor.chain().focus().unsetFontFamily().run();
            } else {
              editor.chain().focus().setFontFamily(fontName).run();
            }
          }}
          className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--page-surface)] text-[var(--text-primary)] text-sm py-1 px-2 outline-none focus:border-[var(--accent-mint)] min-w-[110px]"
          title="Cambiar tipografía"
        >
          <option value="reset">Por defecto</option>
          <option value="'Playfair Display', serif">Playfair</option>
          <option value="'Lora', serif">Lora</option>
          <option value="'Merriweather', serif">Merriweather</option>
          <option value="'Inter', sans-serif">Inter</option>
          <option value="'Roboto', sans-serif">Roboto</option>
        </select>
      </div>

      {/* Text Formatting */}
      <div className="flex gap-0.5 pr-2 border-r border-[var(--border-subtle)]">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Headings */}
      <div className="flex gap-0.5 pr-2 border-r border-[var(--border-subtle)]">
        {[1, 2, 3].map((level) => (
          <ToolbarButton
            key={level}
            onClick={() => editor.chain().focus().toggleHeading({ level: level as any }).run()}
            active={editor.isActive('heading', { level })}
            title={`Heading ${level}`}
          >
            {level === 1 && <Heading1 className="h-4 w-4" />}
            {level === 2 && <Heading2 className="h-4 w-4" />}
            {level === 3 && <Heading3 className="h-4 w-4" />}
          </ToolbarButton>
        ))}
      </div>

      {/* Lists */}
      <div className="flex gap-0.5 pr-2 border-r border-[var(--border-subtle)]">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Ordered List"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Blockquote and Code */}
      <div className="flex gap-0.5 pr-2 border-r border-[var(--border-subtle)]">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Blockquote"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')}
          title="Code Block"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* History */}
      <div className="flex gap-0.5 ml-auto">
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          title="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          title="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
      </div>
    </div>
  );
};

export function AdvancedRichTextEditor({
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
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: 'Empieza a escribir el contenido del capítulo...',
      }),
      CharacterCount.configure({
        limit: 1000000,
      }),
      TextStyle,
      FontFamily,
    ],
    content: defaultContent,
    onUpdate: ({ editor: ed }: { editor: any }) => {
      handleUpdate(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'max-w-none min-h-[300px] p-6 focus:outline-none text-[var(--text-primary)] [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--accent-mint)] [&_blockquote]:pl-4 [&_blockquote]:text-[var(--text-secondary)] [&_h1]:text-3xl [&_h1]:font-black [&_h1]:mt-6 [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:mt-5 [&_h2]:mb-3 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mt-4 [&_h3]:mb-2 [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:leading-relaxed [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_pre]:bg-[var(--surface-soft)] [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:text-sm',
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (!editor) {
    return <div className="text-center py-8 text-[var(--text-secondary)]">Cargando editor avanzado...</div>;
  }

  const wordCount = editor.storage.characterCount.words();
  const charCount = editor.storage.characterCount.characters();

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-[24px] border border-[var(--border-subtle)] bg-[var(--page-surface)] shadow-sm">
      <MenuBar editor={editor} />
      
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>

      <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-soft)] px-5 py-2 flex items-center justify-between text-xs text-[var(--text-tertiary)] font-medium">
        <div className="flex gap-4">
          <span>{wordCount} palabras</span>
          <span>{charCount} caracteres</span>
        </div>
      </div>
    </div>
  );
}
