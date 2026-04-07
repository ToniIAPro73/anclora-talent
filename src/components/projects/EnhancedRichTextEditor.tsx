'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  Heading2, Quote, List, ListOrdered, Link as LinkIcon, Image as ImageIcon,
  Search, RotateCcw, RotateCw, Eye, Maximize2, Minimize2,
  Highlighter, Copy, Trash2
} from 'lucide-react';

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

export function EnhancedRichTextEditor({
  defaultContent,
  onUpdate,
}: {
  defaultContent: string;
  onUpdate: (html: string) => void;
}) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleUpdate = useCallback(
    (html: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onUpdate(html), DEBOUNCE_MS);

      // Update stats
      const text = html.replace(/<[^>]*>/g, '');
      setCharCount(text.length);
      setWordCount(text.split(/\s+/).filter(w => w.length > 0).length);
    },
    [onUpdate],
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      Image,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: defaultContent,
    onUpdate: ({ editor: ed }: { editor: any }) => {
      handleUpdate(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'max-w-none min-h-[400px] p-5 focus:outline-none text-[var(--text-primary)] text-base leading-7 [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--accent-mint)] [&_blockquote]:pl-4 [&_blockquote]:text-[var(--text-secondary)] [&_h1]:text-2xl [&_h1]:font-black [&_h2]:text-xl [&_h2]:font-black [&_h3]:text-lg [&_h3]:font-bold [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:leading-7 [&_ul]:list-disc [&_ul]:pl-6 [&_img]:max-w-full [&_img]:h-auto [&_a]:text-[var(--accent-mint)] [&_a]:underline',
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleAddLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  const handleAddImage = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      editor?.chain().focus().insertContent(`<img src="${url}" />`).run();
    }
  };

  const handleSearch = (text: string) => {
    if (!text) return;

    const editorContent = editor?.view.dom.textContent || '';
    const index = editorContent.indexOf(text);

    if (index !== -1) {
      // Simple visual feedback for search (could be improved with actual selection)
      setSearchTerm(text);
    }
  };

  if (!editor) return null;

  return (
    <div
      className={`${isFullscreen ? 'fixed inset-0 z-50 flex flex-col bg-[var(--page-surface)]' : 'overflow-hidden rounded-[24px] border border-[var(--border-subtle)] bg-[var(--page-surface)]'}`}
      data-testid="enhanced-rich-text-editor"
    >
      {/* Header Stats */}
      {isFullscreen && (
        <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-soft)] px-6 py-4 flex justify-between items-center">
          <div className="flex gap-6 text-sm">
            <span className="text-[var(--text-secondary)]">
              <strong>{wordCount}</strong> palabras
            </span>
            <span className="text-[var(--text-secondary)]">
              <strong>{charCount}</strong> caracteres
            </span>
          </div>
          <button
            onClick={() => setIsFullscreen(false)}
            className="p-2 hover:bg-[var(--surface-highlight)] rounded-lg transition"
            title="Exit fullscreen"
          >
            <Minimize2 className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-[var(--border-subtle)] bg-[var(--surface-soft)] px-3 py-2 overflow-x-auto">
        <ToolbarButton
          dataTestId="editor-toolbar-bold-button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          dataTestId="editor-toolbar-italic-button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          dataTestId="editor-toolbar-underline-button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          dataTestId="editor-toolbar-strikethrough-button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          dataTestId="editor-toolbar-code-button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          title="Code"
        >
          <Code className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          dataTestId="editor-toolbar-highlight-button"
          onClick={() => (editor.chain().focus() as any).toggleHighlight().run()}
          active={editor.isActive('highlight')}
          title="Highlight"
        >
          <Highlighter className="h-3.5 w-3.5" />
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

        <div className="mx-1 h-4 w-px bg-[var(--border-subtle)]" />

        <ToolbarButton
          dataTestId="editor-toolbar-link-button"
          onClick={handleAddLink}
          title="Add link"
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          dataTestId="editor-toolbar-image-button"
          onClick={handleAddImage}
          title="Add image"
        >
          <ImageIcon className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="ml-auto flex gap-1">
          <ToolbarButton
            dataTestId="editor-toolbar-search-button"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            title="Search"
          >
            <Search className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            dataTestId="editor-toolbar-undo-button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            dataTestId="editor-toolbar-redo-button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </ToolbarButton>
          {!isFullscreen && (
            <ToolbarButton
              dataTestId="editor-toolbar-fullscreen-button"
              onClick={() => setIsFullscreen(true)}
              title="Fullscreen"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </ToolbarButton>
          )}
        </div>
      </div>

      {/* Search Bar */}
      {isSearchOpen && (
        <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-soft)] px-3 py-2 flex gap-2">
          <input
            type="text"
            placeholder="Search in content..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1 px-3 py-1 rounded-lg bg-[var(--page-surface)] border border-[var(--border-subtle)] text-sm focus:outline-none focus:border-[var(--accent-mint)]"
          />
          <button
            onClick={() => setIsSearchOpen(false)}
            className="px-3 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-highlight)] rounded-lg transition"
          >
            Close
          </button>
        </div>
      )}

      {/* Editor Content */}
      <div className={`${isFullscreen ? 'flex-1 overflow-y-auto' : ''}`}>
        <EditorContent editor={editor} />
      </div>

      {/* Footer Stats (when not fullscreen) */}
      {!isFullscreen && (
        <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-2 flex justify-between items-center text-xs text-[var(--text-tertiary)]">
          <div className="flex gap-4">
            <span>{wordCount} palabras</span>
            <span>{charCount} caracteres</span>
          </div>
        </div>
      )}
    </div>
  );
}
