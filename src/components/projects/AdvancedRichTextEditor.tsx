'use client';

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { ResizableImage } from './resizable-image-extension';
import { PageBreak } from './page-break-extension';
import { FontSize } from './font-size-extension';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  Undo2,
  Redo2,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Image as ImageIcon,
  Type,
  Baseline,
  Palette,
  ChevronDown,
  Search,
  Check,
  Smartphone,
  Monitor,
  Tablet,
  Columns,
  Minus
} from 'lucide-react';
import { useGoogleFonts } from '@/hooks/use-google-fonts';
import { MarginSelector, type MarginConfig } from './MarginSelector';
import {
  estimateTotalPages,
  calculateWordsPerPage,
  MARGIN_PRESETS,
  type PageCalculationConfig,
} from '@/lib/projects/page-calculator';
import { useEditorPreferences } from '@/hooks/use-editor-preferences';

const DEBOUNCE_MS = 1000;

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
      className={`inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-mint)] disabled:pointer-events-none disabled:opacity-30 ${
        active
          ? 'bg-[var(--accent-mint)] text-white shadow-[0_0_15px_rgba(196,154,36,0.3)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text-primary)]'
      }`}
    >
      {children}
    </button>
  );
}

// Advanced Font Selector using useGoogleFonts
const AdvancedFontSelector = ({ editor }: { editor: any }) => {
  const { fonts, loadFont } = useGoogleFonts();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredFonts = useMemo(() => {
    return fonts
      .filter(f => f.family.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 40);
  }, [fonts, searchQuery]);

  const currentFont = editor.getAttributes('textStyle').fontFamily || 'Default';

  const selectFont = (fontFamily: string) => {
    loadFont(fontFamily);
    editor.chain().focus().setFontFamily(fontFamily).run();
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 min-w-[140px] items-center justify-between gap-2 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-mint)] transition-colors"
      >
        <span className="truncate">{currentFont}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-11 z-[110] w-[220px] rounded-xl border border-[var(--border-strong)] bg-[#0E1825] p-2 shadow-2xl shadow-black animate-in fade-in zoom-in duration-200">
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Buscar fuente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] py-2 pl-8 pr-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-mint)]"
              autoFocus
            />
          </div>
          <div className="max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
            <button
              onClick={() => {
                editor.chain().focus().unsetFontFamily().run();
                setIsOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
            >
              Default
              {!editor.getAttributes('textStyle').fontFamily && <Check className="h-3 w-3" />}
            </button>
            {filteredFonts.map((font) => (
              <button
                key={font.family}
                onClick={() => selectFont(font.family)}
                style={{ fontFamily: font.family }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--hover)]"
              >
                {font.family}
                {currentFont === font.family && <Check className="h-3 w-3 text-[var(--accent-mint)]" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const FontSizeSelector = ({ editor, onFontSizeChange }: { editor: any; onFontSizeChange?: (size: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sizes = [
    { name: 'Pequeño', value: '12px' },
    { name: 'Normal', value: '16px' },
    { name: 'Grande', value: '20px' },
    { name: 'XL', value: '24px' },
    { name: '2XL', value: '32px' },
  ];

  const currentSize = editor.getAttributes('textStyle')?.fontSize || '16px';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <ToolbarButton onClick={() => setIsOpen(!isOpen)} title="Tamaño de fuente">
        <Type className="h-4 w-4" />
      </ToolbarButton>

      {isOpen && (
        <div className="absolute left-0 top-11 z-[110] flex flex-col gap-0.5 rounded-xl border border-[var(--border-strong)] bg-[#0E1825] p-2 shadow-2xl shadow-black animate-in fade-in zoom-in duration-200">
          {sizes.map((size) => (
            <button
              key={size.value}
              onClick={() => {
                editor.chain().focus().setFontSize(size.value).run();
                onFontSizeChange?.(size.value);
                setIsOpen(false);
              }}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                currentSize === size.value
                  ? 'bg-[var(--accent-mint)]/20 text-[var(--accent-mint)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--hover)]'
              }`}
              title={size.name}
            >
              {size.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ColorSelector = ({ editor }: { editor: any }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const colors = [
    { name: 'Default', value: 'inherit' },
    { name: 'Primary', value: '#EDF2F8' },
    { name: 'Secondary', value: '#B0C4D8' },
    { name: 'Accent', value: '#c49a24' },
    { name: 'Sky', value: '#4A9FD8' },
    { name: 'Mint', value: '#2DD4BF' },
    { name: 'Rose', value: '#FB7185' },
    { name: 'Amber', value: '#FBBF24' },
  ];

  const currentColor = editor.getAttributes('textStyle').color || 'inherit';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-[10px] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-mint)] ${
          currentColor !== 'inherit'
            ? 'bg-[var(--accent-mint)] text-white shadow-[0_0_15px_rgba(45,212,191,0.5)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text-primary)]'
        }`}
        title="Color de texto"
      >
        <Palette className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-11 z-[110] rounded-xl border border-[var(--border-strong)] bg-[#0E1825] p-4 shadow-2xl shadow-black animate-in fade-in zoom-in duration-200">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
            Colores
          </div>
          <div className="grid grid-cols-4 gap-3">
            {colors.map((color) => (
              <button
                key={color.value}
                onClick={() => {
                  if (color.value === 'inherit') editor.chain().focus().unsetColor().run();
                  else editor.chain().focus().setColor(color.value).run();
                  setIsOpen(false);
                }}
                className={`relative h-10 w-10 rounded-lg border-2 transition-all duration-200 hover:scale-110 ${
                  currentColor === color.value
                    ? 'border-[var(--accent-mint)] shadow-[0_0_12px_rgba(45,212,191,0.5)]'
                    : 'border-[var(--border-subtle)] hover:border-[var(--accent-mint)]'
                }`}
                style={{ backgroundColor: color.value === 'inherit' ? 'transparent' : color.value }}
                title={color.name}
              >
                {color.value === 'inherit' && (
                  <span className="absolute inset-0 flex items-center justify-center text-[12px] font-bold text-[var(--text-primary)]">∅</span>
                )}
              </button>
            ))}
          </div>
          <div className="mt-3 border-t border-[var(--border-subtle)] pt-3 text-[10px] text-[var(--text-tertiary)] px-1">
            Selecciona un color para el texto
          </div>
        </div>
      )}
    </div>
  );
};

const MenuBar = ({
  editor,
  viewMode,
  setViewMode,
  device,
  setDevice,
  margins,
  onMarginsChange,
  currentFontSize,
  onFontSizeChange,
  wordsPerPage,
}: {
  editor: any;
  viewMode: string;
  setViewMode: any;
  device: string;
  setDevice: any;
  margins: MarginConfig;
  onMarginsChange: (margins: MarginConfig) => void;
  currentFontSize: string;
  onFontSizeChange: (size: string) => void;
  wordsPerPage?: number;
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        // Set default size to 45% width, left aligned with text wrapping
        editor.chain().focus().setImage({ src: imageUrl, width: 350, align: 'left' }).run();
      };
      reader.readAsDataURL(file);
    }
    // Reset the input so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--border-strong)] bg-[#0E1825] px-4 py-2.5">
      {/* View Options */}
      <div className="flex items-center gap-1.5 pr-3 border-r border-[var(--border-subtle)]">
        <ToolbarButton onClick={() => setDevice('mobile')} active={device === 'mobile'} title="Vista Móvil">
          <Smartphone className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => setDevice('tablet')} active={device === 'tablet'} title="Vista Tablet">
          <Tablet className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => setDevice('desktop')} active={device === 'desktop'} title="Vista Escritorio">
          <Monitor className="h-4 w-4" />
        </ToolbarButton>
        <div className="w-px h-4 bg-[var(--border-subtle)] mx-1" />
        <ToolbarButton
          onClick={() => setViewMode(viewMode === 'single' ? 'double' : 'single')}
          active={viewMode === 'double'}
          disabled={device === 'mobile'}
          title="Modo Dos Hojas (no disponible en móvil)"
        >
          <Columns className="h-4 w-4" />
        </ToolbarButton>
      </div>

      <div className="flex items-center gap-2 pr-3 border-r border-[var(--border-subtle)]">
        <AdvancedFontSelector editor={editor} />
        <FontSizeSelector editor={editor} onFontSizeChange={onFontSizeChange} />
        <ColorSelector editor={editor} />
        <MarginSelector margins={margins} onMarginsChange={onMarginsChange} wordsPerPage={wordsPerPage} />
      </div>

      {/* Text Formatting */}
      <div className="flex items-center gap-1 pr-3 border-r border-[var(--border-subtle)]">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Negrita">
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Cursiva">
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Tachado">
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Alignment */}
      <div className="flex items-center gap-1 pr-3 border-r border-[var(--border-subtle)]">
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Alinear izquierda">
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Centrar">
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Alinear derecha">
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justificar">
          <AlignJustify className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Elements */}
      <div className="flex items-center gap-1 pr-3 border-r border-[var(--border-subtle)]">
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Encabezado 1">
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Encabezado 2">
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Encabezado 3">
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista">
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => fileInputRef.current?.click()}
          title="Insertar Imagen (click para archivo o pegar URL)"
        >
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().insertContent({ type: 'pageBreak' }).run()}
          title="Insertar Salto de Página (Ctrl+Shift+Enter)"
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* History */}
      <div className="ml-auto flex items-center gap-1">
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Deshacer">
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Rehacer">
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
      </div>
    </div>
  );
};

export function AdvancedRichTextEditor({
  defaultContent,
  onUpdate,
  currentPage = 0,
}: {
  defaultContent: string;
  onUpdate: (html: string) => void;
  currentPage?: number;
}) {
  const { preferences, isLoaded, setPreferences } = useEditorPreferences();
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>(
    (preferences.device as 'mobile' | 'tablet' | 'desktop') || 'desktop'
  );
  // Initialize viewMode based on device - mobile should always be single
  const [viewMode, setViewMode] = useState<'single' | 'double'>(
    device === 'mobile' ? 'single' : 'double'
  );
  const [autoPages, setAutoPages] = useState<boolean>(true);
  const [margins, setMargins] = useState<MarginConfig>(
    preferences.margins || MARGIN_PRESETS.normal
  );
  const [currentFontSize, setCurrentFontSize] = useState<string>(preferences.fontSize || '16px');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleUpdate = useCallback(
    (html: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onUpdate(html), DEBOUNCE_MS);
    },
    [onUpdate],
  );

  // Save preferences when device changes
  const handleDeviceChange = useCallback(
    (newDevice: 'mobile' | 'tablet' | 'desktop') => {
      setDevice(newDevice);
      setPreferences({ device: newDevice });
      // If switching to mobile, force single page mode
      if (newDevice === 'mobile' && viewMode === 'double') {
        setViewMode('single');
      }
      // If switching from mobile, allow double mode
      if (newDevice !== 'mobile' && viewMode === 'single') {
        setViewMode('double');
      }
    },
    [setPreferences, viewMode]
  );

  // Save preferences when margins change
  const handleMarginsChange = useCallback(
    (newMargins: MarginConfig) => {
      setMargins(newMargins);
      setPreferences({ margins: newMargins });
    },
    [setPreferences]
  );

  // Save preferences when font size changes
  const handleFontSizeChange = useCallback(
    (newSize: string) => {
      setCurrentFontSize(newSize);
      setPreferences({ fontSize: newSize });
    },
    [setPreferences]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: 'Empieza a escribir tu obra maestra...',
      }),
      CharacterCount.configure({ limit: 1000000 }),
      TextStyle,
      FontFamily,
      FontSize,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      ResizableImage.configure({
        allowBase64: true,
      }),
      PageBreak,
    ],
    content: defaultContent,
    onUpdate: ({ editor: ed }) => {
      handleUpdate(ed.getHTML());
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Update editor content when defaultContent changes (e.g., when switching chapters)
  useEffect(() => {
    if (editor && defaultContent !== editor.getHTML()) {
      editor.commands.setContent(defaultContent);
    }
  }, [defaultContent, editor]);

  if (!editor) return null;

  const deviceClasses = {
    mobile: 'max-w-[375px]',
    tablet: 'max-w-[768px]',
    desktop: 'max-w-none w-full',
  };

  // Calculate words per page based on device, font size, and margins
  const pageConfig: PageCalculationConfig = {
    device: device as 'mobile' | 'tablet' | 'desktop',
    fontSize: currentFontSize,
    marginTop: margins.top,
    marginBottom: margins.bottom,
    marginLeft: margins.left,
    marginRight: margins.right,
  };

  const wordsPerPage = calculateWordsPerPage(pageConfig);
  const estimatedPages = estimateTotalPages(editor.getHTML(), pageConfig);

  // For double mode with page navigation, we show 2 pages at a time
  // Current page can range from 0 to estimatedPages - 2
  const displayStartPage = viewMode === 'double' ? currentPage : currentPage;
  const displayEndPage = viewMode === 'double' ? currentPage + 2 : currentPage + 1;

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-[24px] border border-[var(--border-strong)] bg-[#0B121D] shadow-2xl">
      <MenuBar
        editor={editor}
        viewMode={viewMode}
        setViewMode={setViewMode}
        device={device}
        setDevice={handleDeviceChange}
        margins={margins}
        onMarginsChange={handleMarginsChange}
        currentFontSize={currentFontSize}
        onFontSizeChange={handleFontSizeChange}
        wordsPerPage={wordsPerPage}
      />

      <div className="flex-1 overflow-auto bg-[var(--background)] p-6 flex justify-center custom-scrollbar">
        <div className={`transition-all duration-500 ease-in-out ${deviceClasses[device]} ${viewMode === 'double' ? 'grid grid-cols-2 gap-8 max-w-5xl' : ''}`}>
          {/* First page or single page */}
          <div className="bg-[#111C28] min-h-[1000px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-sm border border-white/5 prose prose-invert max-w-none overflow-x-auto prose-img:rounded-lg prose-img:shadow-md">
            <style>{`
              .ProseMirror img {
                max-width: 100%;
                height: auto;
                object-fit: cover;
              }
              .ProseMirror p {
                overflow-wrap: break-word;
                word-break: break-word;
              }
              .ProseMirror {
                word-wrap: break-word;
                overflow-wrap: break-word;
              }
            `}</style>
            {displayStartPage === 0 && <EditorContent editor={editor} />}
            {displayStartPage > 0 && (
              <div className="italic text-[var(--text-tertiary)] text-sm">
                Página {displayStartPage + 1}
              </div>
            )}
          </div>
          {viewMode === 'double' && (
            <div className="bg-[#111C28] min-h-[1000px] p-12 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-sm border border-white/5 opacity-50 flex items-center justify-center italic text-[var(--text-tertiary)]">
              Página {displayEndPage + 1}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-[var(--border-strong)] bg-[#0E1825] px-6 py-2.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
        <div className="flex gap-6">
          <span className="flex items-center gap-1.5"><Type className="h-3 w-3" /> {editor.storage.characterCount.words()} palabras</span>
          <span className="flex items-center gap-1.5"><Baseline className="h-3 w-3" /> {editor.storage.characterCount.characters()} caracteres</span>
        </div>
        <div className="text-[var(--accent-mint)]">Premium Editor Active</div>
      </div>
    </div>
  );
}
