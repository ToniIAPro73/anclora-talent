'use client';

import * as React from 'react';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Extension } from '@tiptap/core';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
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
  ListOrdered,
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
  Minus,
  X,
  IndentIncrease,
  IndentDecrease
} from 'lucide-react';
import { useGoogleFonts } from '@/hooks/use-google-fonts';
import { MarginSelector, type MarginConfig } from './MarginSelector';
import {
  findWordRange,
  hasUsableParagraphAtCursor,
  hasUsableWordAtCursor,
} from './editor-selection-utils';
import {
  calculateWordsPerPage,
  MARGIN_PRESETS,
  type PageCalculationConfig,
} from '@/lib/projects/page-calculator';
import { countRenderablePages, paginateContent } from '@/lib/preview/content-paginator';
import { DEVICE_PAGINATION_CONFIGS } from '@/lib/preview/device-configs';
import { reconcileOverflowBreaks } from '@/lib/preview/editor-page-layout';
import { useEditorPreferences } from '@/hooks/use-editor-preferences';
import { PAGE_BREAK_HTML } from '@/lib/preview/page-breaks';

type ChainedCommand = ReturnType<Editor['chain']>;
type ApplyToSelectionTarget = (command: (chain: ChainedCommand) => ChainedCommand) => boolean;

type ToolbarButtonProps = {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
};

type SplitToolbarButtonProps = {
  icon: React.ReactNode;
  title: string;
  active?: boolean;
  disabled?: boolean;
  onPrimaryClick: () => void;
  children: React.ReactNode;
};

type BulletStyle =
  | 'disc'
  | 'circle'
  | 'square'
  | 'diamond'
  | 'arrow'
  | 'check';

type OrderedStyle =
  | 'decimal'
  | 'decimal-parentheses'
  | 'upper-alpha'
  | 'lower-alpha'
  | 'lower-alpha-parentheses'
  | 'upper-roman'
  | 'lower-roman';

const BULLET_STYLE_OPTIONS: Array<{ value: BulletStyle; label: string; sample: string }> = [
  { value: 'disc', label: 'Punto sólido', sample: '•' },
  { value: 'circle', label: 'Círculo', sample: '○' },
  { value: 'square', label: 'Cuadrado', sample: '■' },
  { value: 'diamond', label: 'Diamante', sample: '◆' },
  { value: 'arrow', label: 'Flecha', sample: '➤' },
  { value: 'check', label: 'Check', sample: '✓' },
];

const ORDERED_STYLE_OPTIONS: Array<{ value: OrderedStyle; label: string; sample: string }> = [
  { value: 'decimal', label: '1. 2. 3.', sample: '1.' },
  { value: 'decimal-parentheses', label: '1) 2) 3)', sample: '1)' },
  { value: 'upper-alpha', label: 'A. B. C.', sample: 'A.' },
  { value: 'lower-alpha', label: 'a. b. c.', sample: 'a.' },
  { value: 'lower-alpha-parentheses', label: 'a) b) c)', sample: 'a)' },
  { value: 'upper-roman', label: 'I. II. III.', sample: 'I.' },
  { value: 'lower-roman', label: 'i. ii. iii.', sample: 'i.' },
];

const StyledBulletList = BulletList.extend({
  addAttributes() {
    return {
      ...(this.parent?.() ?? {}),
      bulletStyle: {
        default: 'disc',
        parseHTML: (element) => element.getAttribute('data-bullet-style') ?? 'disc',
        renderHTML: (attributes) =>
          attributes.bulletStyle && attributes.bulletStyle !== 'disc'
            ? { 'data-bullet-style': attributes.bulletStyle }
            : {},
      },
    };
  },
});

const StyledOrderedList = OrderedList.extend({
  addAttributes() {
    return {
      ...(this.parent?.() ?? {}),
      listStyle: {
        default: 'decimal',
        parseHTML: (element) => element.getAttribute('data-list-style') ?? 'decimal',
        renderHTML: (attributes) =>
          attributes.listStyle && attributes.listStyle !== 'decimal'
            ? { 'data-list-style': attributes.listStyle }
            : {},
      },
    };
  },
});

const ParagraphIndent = Extension.create({
  name: 'paragraphIndent',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const rawValue = element.getAttribute('data-indent');
              return rawValue ? Number.parseInt(rawValue, 10) || 0 : 0;
            },
            renderHTML: (attributes) => {
              const indent = Number(attributes.indent ?? 0);
              if (!indent) return {};
              return {
                'data-indent': String(indent),
                style: `margin-left: ${indent * 2}rem;`,
              };
            },
          },
        },
      },
    ];
  },
});

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

function SplitToolbarButton({
  icon,
  title,
  active,
  disabled,
  onPrimaryClick,
  children,
}: SplitToolbarButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <div
        className={`flex items-center overflow-hidden rounded-[10px] border transition-colors ${
          active
            ? 'border-[var(--accent-mint)] bg-[var(--accent-mint)]/10'
            : 'border-[var(--border-subtle)] bg-transparent'
        } ${disabled ? 'opacity-30' : ''}`}
      >
        <button
          type="button"
          onClick={onPrimaryClick}
          disabled={disabled}
          title={title}
          className="inline-flex h-9 w-9 items-center justify-center text-[var(--text-secondary)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text-primary)] disabled:pointer-events-none"
        >
          {icon}
        </button>
        <button
          type="button"
          onClick={() => !disabled && setIsOpen((open) => !open)}
          disabled={disabled}
          title={`Opciones de ${title.toLowerCase()}`}
          className="inline-flex h-9 w-6 items-center justify-center border-l border-[var(--border-subtle)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text-primary)] disabled:pointer-events-none"
        >
          <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && !disabled && (
        <div className="absolute left-0 top-11 z-[110] min-w-[220px] rounded-xl border border-[var(--border-strong)] bg-[#0E1825] p-2 shadow-2xl shadow-black">
          {children}
        </div>
      )}
    </div>
  );
}

function normalizeEditorHtml(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return '';

  const normalizeBreakMarkup = (html: string) =>
    html
      .replace(
        /<p[^>]*>\s*(?:<[^>]+>\s*)*[─—–_=*·.\s]{5,}(?:\s*<\/[^>]+>)*\s*<\/p>/gi,
        '',
      )
      .replace(/<hr(?![^>]*data-page-break=)[^>]*\/?>/gi, '')
      .replace(/<hr\s+data-page-break="true"\s*\/?>/gi, '<hr data-page-break="manual">')
      .replace(/<hr\s+data-page-break="manual"\s*\/?>/gi, '<hr data-page-break="manual">')
      .replace(/<hr\s+data-page-break="auto"\s*\/?>/gi, '<hr data-page-break="auto">');

  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${trimmed}</div>`, 'text/html');
    const html = doc.body.firstElementChild?.innerHTML ?? '';
    return normalizeBreakMarkup(html.replace(/>\s+</g, '><').replace(/&nbsp;/g, ' '));
  }

  return normalizeBreakMarkup(trimmed.replace(/>\s+</g, '><').replace(/&nbsp;/g, ' '));
}

function countMeaningfulTopLevelBlocks(html: string): number {
  const trimmed = html.trim();
  if (!trimmed || typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return 0;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${trimmed}</div>`, 'text/html');
  const container = doc.body.firstElementChild;
  if (!container) {
    return 0;
  }

  return Array.from(container.childNodes).filter((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return Boolean(node.textContent?.trim());
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    const element = node as Element;
    if (element.tagName === 'HR') {
      return false;
    }

    const textContent = element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    return textContent.length > 0 || element.querySelector('img, video, canvas, svg');
  }).length;
}

// Advanced Font Selector using useGoogleFonts
const AdvancedFontSelector = ({
  editor,
  applyToWordOrSelection,
  isAvailable,
  unavailableTitle,
}: {
  editor: Editor;
  applyToWordOrSelection: ApplyToSelectionTarget;
  isAvailable: boolean;
  unavailableTitle: string;
}) => {
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
    applyToWordOrSelection((chain) => chain.setFontFamily(fontFamily));
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
        onClick={() => isAvailable && setIsOpen(!isOpen)}
        disabled={!isAvailable}
        title={isAvailable ? 'Familia tipográfica' : unavailableTitle}
        className="flex h-9 min-w-[140px] items-center justify-between gap-2 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-mint)] transition-colors disabled:pointer-events-none disabled:opacity-30"
      >
        <span className="truncate">{currentFont}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && isAvailable && (
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
              type="button"
              onClick={() => {
                applyToWordOrSelection((chain) => chain.unsetFontFamily());
                setIsOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
            >
              Default
              {!editor.getAttributes('textStyle').fontFamily && <Check className="h-3 w-3" />}
            </button>
            {filteredFonts.map((font) => (
              <button
                type="button"
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

const FontSizeSelector = ({
  editor,
  onFontSizeChange,
  applyToWordOrSelection,
  isAvailable,
  unavailableTitle,
}: {
  editor: Editor;
  onFontSizeChange?: (size: string) => void;
  applyToWordOrSelection: ApplyToSelectionTarget;
  isAvailable: boolean;
  unavailableTitle: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sizes = [
    { name: '10', value: '10px' },
    { name: '11', value: '11px' },
    { name: '12', value: '12px' },
    { name: '14', value: '14px' },
    { name: '16', value: '16px' },
    { name: '18', value: '18px' },
    { name: '20', value: '20px' },
    { name: '24', value: '24px' },
    { name: '28', value: '28px' },
    { name: '32', value: '32px' },
    { name: '36', value: '36px' },
    { name: '48', value: '48px' },
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
      <ToolbarButton
        onClick={() => isAvailable && setIsOpen(!isOpen)}
        disabled={!isAvailable}
        title={isAvailable ? 'Tamaño de fuente' : unavailableTitle}
      >
        <Type className="h-4 w-4" />
      </ToolbarButton>

      {isOpen && isAvailable && (
        <div className="absolute left-0 top-11 z-[110] flex flex-col gap-0.5 rounded-xl border border-[var(--border-strong)] bg-[#0E1825] p-2 shadow-2xl shadow-black animate-in fade-in zoom-in duration-200">
          {sizes.map((size) => (
            <button
              type="button"
              key={size.value}
              onClick={() => {
                applyToWordOrSelection((chain) => chain.setFontSize(size.value));
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

const ColorSelector = ({
  editor,
  applyToWordOrSelection,
  isAvailable,
  unavailableTitle,
}: {
  editor: Editor;
  applyToWordOrSelection: ApplyToSelectionTarget;
  isAvailable: boolean;
  unavailableTitle: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const colors = [
    { name: 'Por Defecto', value: 'inherit', description: 'Color normal del texto' },
    { name: 'Blanco Editorial', value: '#EDF2F8', description: 'Neutral claro más fuerte' },
    { name: 'Marfil Suave', value: '#E5E7EB', description: 'Neutral claro más suave' },
    { name: 'Gris Pizarra', value: '#94A3B8', description: 'Gris azulado frío' },
    { name: 'Tinta Oscura', value: '#0F172A', description: 'Tono ink-style profundo' },
    { name: 'Oro Premium', value: '#C49A24', description: 'Dorado editorial principal' },
    { name: 'Oro Cálido', value: '#D4A017', description: 'Variante premium más luminosa' },
    { name: 'Azul Editorial', value: '#4A9FD8', description: 'Azul profesional' },
    { name: 'Azul Bruma', value: '#60A5FA', description: 'Azul más vivo y claro' },
    { name: 'Menta Editorial', value: '#14B8A6', description: 'Acento teal principal' },
    { name: 'Menta Suave', value: '#2DD4BF', description: 'Variante teal más brillante' },
    { name: 'Coral Editorial', value: '#FB7185', description: 'Rosa coral cálido' },
    { name: 'Rojo Rosa', value: '#F43F5E', description: 'Variante rose más intensa' },
    { name: 'Ámbar Editorial', value: '#F59E0B', description: 'Ámbar principal' },
    { name: 'Ámbar Profundo', value: '#D97706', description: 'Variante ámbar más cálida' },
  ];

  const currentColor = editor.getAttributes('textStyle').color || 'inherit';
  const currentColorName = colors.find(c => c.value === currentColor)?.name || 'Por Defecto';

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
        onClick={() => isAvailable && setIsOpen(!isOpen)}
        disabled={!isAvailable}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-[10px] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-mint)] disabled:opacity-30 disabled:cursor-not-allowed ${
          isAvailable && currentColor !== 'inherit'
            ? 'bg-[var(--accent-mint)] text-white shadow-[0_0_15px_rgba(45,212,191,0.5)]'
            : isAvailable
            ? 'text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text-primary)]'
            : 'text-[var(--text-secondary)]'
        }`}
        title={isAvailable ? 'Color de texto' : unavailableTitle}
      >
        <Palette className="h-4 w-4" />
      </button>

      {isOpen && isAvailable && (
        <div className="absolute left-0 top-11 z-[110] w-[min(92vw,320px)] rounded-2xl border border-[var(--border-strong)] bg-[#0E1825] p-3 shadow-2xl shadow-black/50 animate-in fade-in zoom-in duration-200">
          <div className="mb-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">
              Paleta de Colores
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)]/50 p-2.5">
              <div
                className="h-6 w-6 rounded-lg border border-[var(--border-strong)]"
                style={{ backgroundColor: currentColor === 'inherit' ? 'var(--text-primary)' : currentColor }}
              />
              <span className="text-xs font-semibold text-[var(--text-primary)]">{currentColorName}</span>
            </div>
          </div>

          <div className="grid max-h-[320px] grid-cols-1 gap-2 overflow-y-auto pr-1 custom-scrollbar">
            {colors.map((color) => (
              <button
                type="button"
                key={color.value}
                onClick={() => {
                  if (color.value === 'inherit') applyToWordOrSelection((chain) => chain.unsetColor());
                  else applyToWordOrSelection((chain) => chain.setColor(color.value));
                  setIsOpen(false);
                }}
                className={`group flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-all duration-200 ${
                  currentColor === color.value
                    ? 'border-[var(--accent-mint)] bg-[var(--accent-mint)]/10'
                    : 'border-[var(--border-subtle)] bg-[var(--background)]/30 hover:border-[var(--accent-mint)]/50'
                }`}
                title={color.name}
              >
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-white/20 text-[8px] font-bold transition-transform duration-200 group-hover:scale-105"
                  style={{ backgroundColor: color.value === 'inherit' ? 'transparent' : color.value }}
                >
                  {color.value === 'inherit' ? '∅' : ''}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold text-[var(--text-primary)]">{color.name}</div>
                  <div className="text-[9px] text-[var(--text-tertiary)]">{color.description}</div>
                </div>
              </button>
            ))}
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
  onFontSizeChange,
  wordsPerPage,
}: {
  editor: Editor;
  viewMode: string;
  setViewMode: React.Dispatch<React.SetStateAction<'single' | 'double'>>;
  device: string;
  setDevice: (device: 'mobile' | 'tablet' | 'desktop') => void;
  margins: MarginConfig;
  onMarginsChange: (margins: MarginConfig) => void;
  onFontSizeChange: (size: string) => void;
  wordsPerPage?: number;
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const selection = editor.state.selection;
  const parentText = selection.$from.parent.textContent ?? '';
  const inlineTargetAvailable =
    !selection.empty || hasUsableWordAtCursor(parentText, selection.$from.parentOffset);
  const blockTargetAvailable =
    !selection.empty || hasUsableParagraphAtCursor(parentText);
  const inlineUnavailableTitle = 'Coloca el cursor dentro de una palabra o selecciona texto';
  const blockUnavailableTitle = 'Coloca el cursor en un párrafo con texto o selecciona texto';
  const [currentBulletStyle, setCurrentBulletStyle] = useState<BulletStyle>('disc');
  const [currentOrderedStyle, setCurrentOrderedStyle] = useState<OrderedStyle>('decimal');

  const applyToWordOrSelection: ApplyToSelectionTarget = (command) => {
    const { state, view } = editor;
    const { selection } = state;

    if (!selection.empty) {
      return command(editor.chain().focus()).run();
    }

    const { $from } = selection;
    const parentText = $from.parent.textContent ?? '';
    const wordRange = findWordRange(parentText, $from.parentOffset);
    const cursorPosition = selection.from;

    if (!wordRange) return false;

    view.dispatch(
      state.tr.setSelection(
        TextSelection.create(
          state.doc,
          $from.start() + wordRange.from,
          $from.start() + wordRange.to,
        ),
      ),
    );

    const applied = command(editor.chain().focus()).run();

    if (!applied) return false;

    const nextState = editor.state;
    editor.view.dispatch(
      nextState.tr.setSelection(TextSelection.create(nextState.doc, cursorPosition)),
    );

    return true;
  };

  const applyToParagraphOrSelection: ApplyToSelectionTarget = (command) => {
    const { state, view } = editor;
    const { selection } = state;

    if (!selection.empty) {
      return command(editor.chain().focus()).run();
    }

    const paragraphText = selection.$from.parent.textContent ?? '';
    if (!hasUsableParagraphAtCursor(paragraphText)) return false;

    const paragraphStart = selection.$from.start();
    const paragraphEnd = selection.$from.end();
    const cursorPosition = selection.from;

    view.dispatch(
      state.tr.setSelection(TextSelection.create(state.doc, paragraphStart, paragraphEnd)),
    );

    const applied = command(editor.chain().focus()).run();

    if (!applied) return false;

    const nextState = editor.state;
    editor.view.dispatch(
      nextState.tr.setSelection(TextSelection.create(nextState.doc, cursorPosition)),
    );

    return true;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        // Set default size to 45% width, left aligned with text wrapping
        editor.chain().focus().insertContent({ type: 'image', attrs: { src: imageUrl, width: 350, align: 'left' } }).run();
      };
      reader.readAsDataURL(file);
    }
    // Reset the input so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const applyBulletList = (style: BulletStyle = currentBulletStyle) => {
    setCurrentBulletStyle(style);
    const chain = editor.chain().focus();
    if (editor.isActive('orderedList')) {
      chain.toggleOrderedList();
    }
    if (!editor.isActive('bulletList')) {
      chain.toggleBulletList();
    }
    return chain.updateAttributes('bulletList', { bulletStyle: style }).run();
  };

  const applyOrderedList = (style: OrderedStyle = currentOrderedStyle) => {
    setCurrentOrderedStyle(style);
    const chain = editor.chain().focus();
    if (editor.isActive('bulletList')) {
      chain.toggleBulletList();
    }
    if (!editor.isActive('orderedList')) {
      chain.toggleOrderedList();
    }
    return chain.updateAttributes('orderedList', { listStyle: style }).run();
  };

  const updateBlockIndent = (delta: number) => {
    const blockType = editor.state.selection.$from.parent.type.name;
    if (blockType === 'listItem') {
      return delta > 0
        ? editor.chain().focus().sinkListItem('listItem').run()
        : editor.chain().focus().liftListItem('listItem').run();
    }

    if (blockType !== 'paragraph' && blockType !== 'heading') {
      return false;
    }

    const currentIndent = Number(editor.state.selection.$from.parent.attrs.indent ?? 0);
    const nextIndent = Math.max(0, Math.min(6, currentIndent + delta));

    return editor.chain().focus().updateAttributes(blockType, { indent: nextIndent }).run();
  };

  const indentListItem = () => updateBlockIndent(1);
  const outdentListItem = () => updateBlockIndent(-1);

  const removeNextPageBreak = () => {
    const { doc, selection } = editor.state;
    let target: { from: number; to: number } | null = null;

    doc.descendants((node, pos) => {
      if (node.type.name !== 'pageBreak') return true;
      if (pos + node.nodeSize <= selection.from) return true;
      target = { from: pos, to: pos + node.nodeSize };
      return false;
    });

    if (!target) return false;

    return editor.chain().focus().deleteRange(target).run();
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
        <AdvancedFontSelector
          editor={editor}
          applyToWordOrSelection={applyToWordOrSelection}
          isAvailable={inlineTargetAvailable}
          unavailableTitle={inlineUnavailableTitle}
        />
        <FontSizeSelector
          editor={editor}
          onFontSizeChange={onFontSizeChange}
          applyToWordOrSelection={applyToWordOrSelection}
          isAvailable={inlineTargetAvailable}
          unavailableTitle={inlineUnavailableTitle}
        />
        <ColorSelector
          editor={editor}
          applyToWordOrSelection={applyToWordOrSelection}
          isAvailable={inlineTargetAvailable}
          unavailableTitle={inlineUnavailableTitle}
        />
        <MarginSelector margins={margins} onMarginsChange={onMarginsChange} wordsPerPage={wordsPerPage} />
      </div>

      {/* Text Formatting */}
      <div className="flex items-center gap-1 pr-3 border-r border-[var(--border-subtle)]">
        <ToolbarButton
          onClick={() => applyToWordOrSelection((chain) => chain.toggleBold())}
          active={editor.isActive('bold')}
          disabled={!inlineTargetAvailable}
          title={inlineTargetAvailable ? 'Negrita' : inlineUnavailableTitle}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => applyToWordOrSelection((chain) => chain.toggleItalic())}
          active={editor.isActive('italic')}
          disabled={!inlineTargetAvailable}
          title={inlineTargetAvailable ? 'Cursiva' : inlineUnavailableTitle}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => applyToWordOrSelection((chain) => chain.toggleStrike())}
          active={editor.isActive('strike')}
          disabled={!inlineTargetAvailable}
          title={inlineTargetAvailable ? 'Tachado' : inlineUnavailableTitle}
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Alignment */}
      <div className="flex items-center gap-1 pr-3 border-r border-[var(--border-subtle)]">
        <ToolbarButton
          onClick={() => applyToParagraphOrSelection((chain) => chain.setTextAlign('left'))}
          active={editor.isActive({ textAlign: 'left' })}
          disabled={!blockTargetAvailable}
          title={blockTargetAvailable ? 'Alinear izquierda' : blockUnavailableTitle}
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => applyToParagraphOrSelection((chain) => chain.setTextAlign('center'))}
          active={editor.isActive({ textAlign: 'center' })}
          disabled={!blockTargetAvailable}
          title={blockTargetAvailable ? 'Centrar' : blockUnavailableTitle}
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => applyToParagraphOrSelection((chain) => chain.setTextAlign('right'))}
          active={editor.isActive({ textAlign: 'right' })}
          disabled={!blockTargetAvailable}
          title={blockTargetAvailable ? 'Alinear derecha' : blockUnavailableTitle}
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => applyToParagraphOrSelection((chain) => chain.setTextAlign('justify'))}
          active={editor.isActive({ textAlign: 'justify' })}
          disabled={!blockTargetAvailable}
          title={blockTargetAvailable ? 'Justificar' : blockUnavailableTitle}
        >
          <AlignJustify className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Elements */}
      <div className="flex items-center gap-1 pr-3 border-r border-[var(--border-subtle)]">
        <ToolbarButton
          onClick={() => applyToParagraphOrSelection((chain) => chain.toggleHeading({ level: 1 }))}
          active={editor.isActive('heading', { level: 1 })}
          disabled={!blockTargetAvailable}
          title={blockTargetAvailable ? 'Encabezado 1' : blockUnavailableTitle}
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => applyToParagraphOrSelection((chain) => chain.toggleHeading({ level: 2 }))}
          active={editor.isActive('heading', { level: 2 })}
          disabled={!blockTargetAvailable}
          title={blockTargetAvailable ? 'Encabezado 2' : blockUnavailableTitle}
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => applyToParagraphOrSelection((chain) => chain.toggleHeading({ level: 3 }))}
          active={editor.isActive('heading', { level: 3 })}
          disabled={!blockTargetAvailable}
          title={blockTargetAvailable ? 'Encabezado 3' : blockUnavailableTitle}
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => applyToParagraphOrSelection((chain) => chain.toggleHeading({ level: 4 }))}
          active={editor.isActive('heading', { level: 4 })}
          disabled={!blockTargetAvailable}
          title={blockTargetAvailable ? 'Encabezado 4' : blockUnavailableTitle}
        >
          <span className="text-[11px] font-bold">H4</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => applyToParagraphOrSelection((chain) => chain.toggleHeading({ level: 5 }))}
          active={editor.isActive('heading', { level: 5 })}
          disabled={!blockTargetAvailable}
          title={blockTargetAvailable ? 'Encabezado 5' : blockUnavailableTitle}
        >
          <span className="text-[11px] font-bold">H5</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => applyToParagraphOrSelection((chain) => chain.toggleHeading({ level: 6 }))}
          active={editor.isActive('heading', { level: 6 })}
          disabled={!blockTargetAvailable}
          title={blockTargetAvailable ? 'Encabezado 6' : blockUnavailableTitle}
        >
          <span className="text-[11px] font-bold">H6</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={outdentListItem}
          title="Tabular a la izquierda"
        >
          <IndentDecrease className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={indentListItem}
          title="Tabular a la derecha"
        >
          <IndentIncrease className="h-4 w-4" />
        </ToolbarButton>
        <SplitToolbarButton
          icon={<List className="h-4 w-4" />}
          title="Lista con viñetas"
          active={editor.isActive('bulletList')}
          onPrimaryClick={() => applyBulletList()}
        >
          <div className="grid grid-cols-3 gap-2">
            {BULLET_STYLE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => applyBulletList(option.value)}
                className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                  currentBulletStyle === option.value
                    ? 'border-[var(--accent-mint)] bg-[var(--accent-mint)]/10 text-[var(--text-primary)]'
                    : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--accent-mint)]/50'
                }`}
                title={option.label}
              >
                <div className="text-lg font-semibold">{option.sample}</div>
                <div className="mt-1 text-[10px]">{option.label}</div>
              </button>
            ))}
          </div>
        </SplitToolbarButton>
        <SplitToolbarButton
          icon={<ListOrdered className="h-4 w-4" />}
          title="Lista numerada"
          active={editor.isActive('orderedList')}
          onPrimaryClick={() => applyOrderedList()}
        >
          <div className="grid grid-cols-2 gap-2">
            {ORDERED_STYLE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => applyOrderedList(option.value)}
                className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                  currentOrderedStyle === option.value
                    ? 'border-[var(--accent-mint)] bg-[var(--accent-mint)]/10 text-[var(--text-primary)]'
                    : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--accent-mint)]/50'
                }`}
                title={option.label}
              >
                <div className="text-sm font-semibold">{option.sample}</div>
                <div className="mt-1 text-[10px]">{option.label}</div>
              </button>
            ))}
          </div>
        </SplitToolbarButton>
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
          onClick={() => editor.chain().focus().insertContent(PAGE_BREAK_HTML).run()}
          title="Insertar Salto de Página (Ctrl+Shift+Enter)"
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={removeNextPageBreak}
          title="Eliminar el primer salto de página por debajo del cursor"
        >
          <X className="h-4 w-4" />
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
  totalPages,
  onPageCountChange,
  contentZoom = 100,
}: {
  defaultContent: string;
  onUpdate: (html: string) => void;
  currentPage?: number;
  totalPages?: number;
  onPageCountChange?: (pages: number) => void;
  contentZoom?: number;
}) {
  const { preferences, setPreferences } = useEditorPreferences();
  const isSyncingExternalContentRef = useRef(false);
  const multipageFlowRef = useRef<HTMLDivElement>(null);
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>(
    (preferences.device as 'mobile' | 'tablet' | 'desktop') || 'desktop'
  );
  // Initialize viewMode based on device - mobile should always be single
  const [viewMode, setViewMode] = useState<'single' | 'double'>(
    device === 'mobile' ? 'single' : 'double'
  );
  const [margins, setMargins] = useState<MarginConfig>(
    preferences.margins || MARGIN_PRESETS.normal
  );
  const [currentFontSize, setCurrentFontSize] = useState<string>(preferences.fontSize || '16px');

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
  const previewFormat = device === 'desktop' ? 'laptop' : device;
  const previewConfig = useMemo(() => {
    const baseConfig = DEVICE_PAGINATION_CONFIGS[previewFormat];
    return {
      ...baseConfig,
      fontSize: Number.parseInt(currentFontSize, 10) || baseConfig.fontSize,
      marginTop: margins.top,
      marginBottom: margins.bottom,
      marginLeft: margins.left,
      marginRight: margins.right,
    };
  }, [currentFontSize, margins.bottom, margins.left, margins.right, margins.top, previewFormat]);
  const actualRenderablePages = useMemo(() => {
    const reconciledHtml = reconcileOverflowBreaks(defaultContent, previewConfig);
    return countRenderablePages(paginateContent(reconciledHtml, previewConfig));
  }, [defaultContent, previewConfig]);
  const totalRenderablePages = Math.max(
    1,
    Math.min(totalPages ?? actualRenderablePages, actualRenderablePages),
  );
  const spreadStartPage =
    viewMode === 'double' ? Math.max(0, currentPage - (currentPage % 2)) : currentPage;
  const showSecondPage = viewMode === 'double' && spreadStartPage + 1 < totalRenderablePages;
  const lastPublishedContentRef = useRef(normalizeEditorHtml(defaultContent));

  const handleUpdate = useCallback(
    (html: string) => {
      lastPublishedContentRef.current = normalizeEditorHtml(html);
      onUpdate(html);
    },
    [onUpdate],
  );

  const syncEditorContent = useCallback(
    (targetEditor: Editor, nextHtml: string) => {
      const previousSelection = targetEditor.state.selection;
      const coordsAtPos =
        typeof targetEditor.view?.coordsAtPos === 'function'
          ? targetEditor.view.coordsAtPos.bind(targetEditor.view)
          : null;
      const posAtCoords =
        typeof targetEditor.view?.posAtCoords === 'function'
          ? targetEditor.view.posAtCoords.bind(targetEditor.view)
          : null;
      const previousAnchorCoords =
        previousSelection && coordsAtPos
          ? (() => {
              try {
                return coordsAtPos(previousSelection.from);
              } catch {
                return null;
              }
            })()
          : null;
      const previousHeadCoords =
        previousSelection && !previousSelection.empty && coordsAtPos
          ? (() => {
              try {
                return coordsAtPos(previousSelection.to);
              } catch {
                return null;
              }
            })()
          : null;

      isSyncingExternalContentRef.current = true;
      targetEditor.commands.setContent(nextHtml, { emitUpdate: false });

      if (!previousSelection || typeof targetEditor.view?.dispatch !== 'function') {
        return;
      }

      if (previousAnchorCoords && posAtCoords) {
        try {
          const resolvedAnchor = posAtCoords({
            left: previousAnchorCoords.left,
            top: Math.max(previousAnchorCoords.top + 1, previousAnchorCoords.bottom - 1),
          });
          const resolvedHead =
            previousHeadCoords && !previousSelection.empty
              ? posAtCoords({
                  left: previousHeadCoords.left,
                  top: Math.max(previousHeadCoords.top + 1, previousHeadCoords.bottom - 1),
                })
              : null;

          if (resolvedAnchor?.pos) {
            const visualFrom = resolvedAnchor.pos;
            const visualTo =
              resolvedHead?.pos && !previousSelection.empty
                ? resolvedHead.pos
                : visualFrom;

            targetEditor.view.dispatch(
              targetEditor.state.tr.setSelection(
                TextSelection.create(
                  targetEditor.state.doc,
                  Math.min(visualFrom, visualTo),
                  Math.max(visualFrom, visualTo),
                ),
              ),
            );
            return;
          }
        } catch {
          // Fall through to positional restoration below if coordinate-based restoration fails.
        }
      }

      const maxSelectionPos =
        typeof (targetEditor.state.doc as { content?: { size?: number } })?.content?.size === 'number'
          ? Math.max(1, (targetEditor.state.doc as { content: { size: number } }).content.size)
          : null;

      const safeFrom =
        maxSelectionPos === null
          ? previousSelection.from
          : Math.min(Math.max(1, previousSelection.from), maxSelectionPos);
      const safeTo =
        maxSelectionPos === null
          ? previousSelection.to
          : Math.min(Math.max(1, previousSelection.to), maxSelectionPos);

      try {
        targetEditor.view.dispatch(
          targetEditor.state.tr.setSelection(
            TextSelection.create(targetEditor.state.doc, safeFrom, safeTo),
          ),
        );
      } catch {
        // If the reconciled document shape invalidates the old selection, keep the editor stable
        // and let the browser/ProseMirror resolve the next valid caret position naturally.
      }
    },
    [],
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
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        bulletList: false,
        orderedList: false,
        horizontalRule: false,
      }),
      StyledBulletList,
      StyledOrderedList,
      ParagraphIndent,
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
        if (isSyncingExternalContentRef.current) {
          isSyncingExternalContentRef.current = false;
          return;
        }

        const currentHtml = ed.getHTML();
        const reconciledHtml = reconcileOverflowBreaks(currentHtml, previewConfig);
        const currentAutoBreakCount =
          (currentHtml.match(/data-page-break="auto"/g) ?? []).length;
        const reconciledAutoBreakCount =
          (reconciledHtml.match(/data-page-break="auto"/g) ?? []).length;
        const meaningfulBlockCount = countMeaningfulTopLevelBlocks(currentHtml);

        // Heuristic reconciliation is reliable for oversized single blocks, but it becomes too
        // aggressive after local paragraph inserts in multi-block chapters.
        if (
          currentAutoBreakCount === 0 &&
          reconciledAutoBreakCount > 1 &&
          meaningfulBlockCount > 1
        ) {
          handleUpdate(currentHtml);
          return;
        }

        if (normalizeEditorHtml(reconciledHtml) !== normalizeEditorHtml(currentHtml)) {
          syncEditorContent(ed, reconciledHtml);
          handleUpdate(reconciledHtml);
        return;
      }

      handleUpdate(currentHtml);
    },
    immediatelyRender: false,
  });

  // Update editor content when defaultContent changes (e.g., when switching chapters)
  useEffect(() => {
    if (!editor) {
      return;
    }

    const normalizedIncomingContent = normalizeEditorHtml(defaultContent);
    if (normalizedIncomingContent === lastPublishedContentRef.current) {
      return;
    }

    if (normalizedIncomingContent !== normalizeEditorHtml(editor.getHTML())) {
      syncEditorContent(editor, defaultContent);
      lastPublishedContentRef.current = normalizedIncomingContent;
    }
  }, [defaultContent, editor, syncEditorContent]);

  const pagePaddingStyle = {
    paddingTop: `${margins.top}px`,
    paddingBottom: `${margins.bottom}px`,
    paddingLeft: `${margins.left}px`,
    paddingRight: `${margins.right}px`,
  };
  const pageWidth = previewConfig.pageWidth;
  const pageHeight = previewConfig.pageHeight;
  const zoomScale = Math.max(0.5, Math.min(1.5, contentZoom / 100));
  const pageGap = 32;
  const contentWidth = Math.max(120, pageWidth - margins.left - margins.right);
  const contentHeight = Math.max(120, pageHeight - margins.top - margins.bottom);
  const columnGap = pageGap + margins.left + margins.right;
  const viewportWidth = showSecondPage ? pageWidth * 2 + pageGap : pageWidth;
  const flowWidth =
    contentWidth * totalRenderablePages +
    columnGap * Math.max(totalRenderablePages - 1, 0);
  const flowOffset = spreadStartPage * (pageWidth + pageGap);
  const visiblePageIndices = Array.from(
    { length: showSecondPage ? 2 : 1 },
    (_, index) => spreadStartPage + index,
  ).filter((pageIndex) => pageIndex < totalRenderablePages);

  const measureRenderablePages = useCallback(() => {
    const proseMirror = multipageFlowRef.current?.querySelector('.ProseMirror') as HTMLElement | null;
    if (!proseMirror || !onPageCountChange) {
      return;
    }

    const proseMirrorRect = proseMirror.getBoundingClientRect();
    const childNodes = Array.from(proseMirror.children) as HTMLElement[];
    const occupiedWidth = childNodes.reduce((maxRight, child) => {
      const rects = Array.from(child.getClientRects());
      if (rects.length === 0) {
        return maxRight;
      }

      const childRight = Math.max(
        ...rects.map((rect) => Math.max(0, rect.right - proseMirrorRect.left)),
      );

      return Math.max(maxRight, childRight);
    }, 0);

    const measuredPages = Math.max(
      1,
      Math.ceil((occupiedWidth + 1) / (contentWidth + columnGap)),
    );

    onPageCountChange(measuredPages);
  }, [columnGap, contentWidth, onPageCountChange]);

  const focusVisiblePage = useCallback(
    (pageIndex: number) => {
      if (!editor) {
        return;
      }

      const flowBounds = multipageFlowRef.current?.getBoundingClientRect();
      const posAtCoords =
        typeof editor.view?.posAtCoords === 'function'
          ? editor.view.posAtCoords.bind(editor.view)
          : null;

      if (!flowBounds || !posAtCoords) {
        return;
      }

      const relativePageIndex = Math.max(0, pageIndex - spreadStartPage);
      const coords = {
        left: flowBounds.left + relativePageIndex * (pageWidth + pageGap) + 8,
        top: flowBounds.top + 8,
      };
      const resolved = posAtCoords(coords);

      if (!resolved?.pos) {
        return;
      }

      editor.view.dispatch(
        editor.state.tr.setSelection(
          TextSelection.create(editor.state.doc, resolved.pos),
        ),
      );

      if (typeof editor.view.focus === 'function') {
        editor.view.focus();
      }
    },
    [editor, pageGap, pageWidth, spreadStartPage],
  );

  useEffect(() => {
    if (!editor || !onPageCountChange) {
      return;
    }

    const scheduleMeasure = () => {
      requestAnimationFrame(measureRenderablePages);
    };

    scheduleMeasure();
    editor.on('update', scheduleMeasure);
    window.addEventListener('resize', scheduleMeasure);

    return () => {
      editor.off('update', scheduleMeasure);
      window.removeEventListener('resize', scheduleMeasure);
    };
  }, [editor, measureRenderablePages, onPageCountChange]);

  useEffect(() => {
    if (!editor || totalRenderablePages <= 1) {
      return;
    }

    focusVisiblePage(currentPage);
  }, [currentPage, editor, focusVisiblePage, totalRenderablePages]);

  if (!editor) return null;

  const deviceClasses = {
    mobile: 'max-w-[375px]',
    tablet: 'w-full',
    desktop: 'max-w-none w-full',
  };

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
        onFontSizeChange={handleFontSizeChange}
        wordsPerPage={wordsPerPage}
      />

      <div className="flex flex-1 justify-center overflow-auto bg-[var(--background)] p-4 custom-scrollbar">
        <div
          className={`transition-all duration-500 ease-in-out ${deviceClasses[device]}`}
          style={{
            width: `${viewportWidth * zoomScale}px`,
            minHeight: `${pageHeight * zoomScale}px`,
          }}
        >
          <div
            className="relative mx-auto overflow-hidden"
            style={{
              width: `${viewportWidth}px`,
              minHeight: `${pageHeight}px`,
              transform: `scale(${zoomScale})`,
              transformOrigin: 'top left',
            }}
          >
            <style>{`
              .ProseMirror {
                font-size: ${previewConfig.fontSize}px;
                line-height: ${previewConfig.lineHeight};
                word-wrap: break-word;
                overflow-wrap: break-word;
              }
              .ProseMirror img {
                max-width: 100%;
                height: auto;
                object-fit: cover;
              }
              .ProseMirror p {
                margin: 0;
                overflow-wrap: break-word;
                word-break: break-word;
              }
              .ProseMirror p + p,
              .preview-page p + p {
                margin-top: 0.8rem;
              }
              .ProseMirror [data-toc-line="true"],
              .preview-page [data-toc-line="true"] {
                display: grid;
                grid-template-columns: auto minmax(0, 1fr) auto;
                align-items: baseline;
                column-gap: 0.5rem;
                width: 100%;
              }
              .ProseMirror [data-toc-title="true"],
              .preview-page [data-toc-title="true"] {
                display: inline-block;
                min-width: 0;
              }
              .ProseMirror [data-toc-leader="true"],
              .preview-page [data-toc-leader="true"] {
                display: block;
                min-width: 0.5rem;
                overflow: hidden;
                color: var(--text-tertiary);
                letter-spacing: 0.08em;
                line-height: 1;
                transform: translateY(-0.02em);
                white-space: nowrap;
              }
              .ProseMirror [data-toc-page="true"],
              .preview-page [data-toc-page="true"] {
                display: inline-block;
                min-width: 1.5rem;
                text-align: right;
                font-weight: 700;
                white-space: nowrap;
              }
              .ProseMirror h1,
              .preview-page h1 {
                font-size: 2rem;
                line-height: 1.1;
                font-weight: 800;
                margin: 0 0 1rem 0;
                color: var(--text-primary);
              }
              .ProseMirror h2,
              .preview-page h2 {
                font-size: 1.5rem;
                line-height: 1.2;
                font-weight: 750;
                margin: 0 0 0.85rem 0;
                color: var(--text-primary);
              }
              .ProseMirror h3,
              .preview-page h3 {
                font-size: 1.2rem;
                line-height: 1.3;
                font-weight: 700;
                margin: 0 0 0.75rem 0;
                color: var(--text-primary);
              }
              .ProseMirror h4,
              .preview-page h4 {
                font-size: 1.05rem;
                line-height: 1.35;
                font-weight: 700;
                margin: 0 0 0.65rem 0;
                color: var(--text-primary);
              }
              .ProseMirror h5,
              .preview-page h5,
              .ProseMirror h6,
              .preview-page h6 {
                font-size: 0.95rem;
                line-height: 1.4;
                font-weight: 700;
                margin: 0 0 0.6rem 0;
                color: var(--text-primary);
              }
              .ProseMirror ul,
              .preview-page ul,
              .ProseMirror ol,
              .preview-page ol {
                margin: 0 0 1rem 1.5rem;
                padding: 0;
              }
              .ProseMirror ul:not([data-bullet-style]),
              .preview-page ul:not([data-bullet-style]) {
                list-style-type: disc;
              }
              .ProseMirror ol:not([data-list-style]),
              .preview-page ol:not([data-list-style]) {
                list-style-type: decimal;
              }
              .ProseMirror li,
              .preview-page li {
                margin: 0.35rem 0;
              }
              .ProseMirror ul[data-bullet-style="disc"],
              .preview-page ul[data-bullet-style="disc"] {
                list-style-type: disc;
              }
              .ProseMirror ul[data-bullet-style="circle"],
              .preview-page ul[data-bullet-style="circle"] {
                list-style-type: circle;
              }
              .ProseMirror ul[data-bullet-style="square"],
              .preview-page ul[data-bullet-style="square"] {
                list-style-type: square;
              }
              .ProseMirror ul[data-bullet-style="diamond"],
              .preview-page ul[data-bullet-style="diamond"],
              .ProseMirror ul[data-bullet-style="arrow"],
              .preview-page ul[data-bullet-style="arrow"],
              .ProseMirror ul[data-bullet-style="check"],
              .preview-page ul[data-bullet-style="check"] {
                list-style: none;
                padding-left: 0;
              }
              .ProseMirror ul[data-bullet-style="diamond"] > li,
              .preview-page ul[data-bullet-style="diamond"] > li,
              .ProseMirror ul[data-bullet-style="arrow"] > li,
              .preview-page ul[data-bullet-style="arrow"] > li,
              .ProseMirror ul[data-bullet-style="check"] > li,
              .preview-page ul[data-bullet-style="check"] > li {
                position: relative;
                padding-left: 1.5rem;
              }
              .ProseMirror ul[data-bullet-style="diamond"] > li::before,
              .preview-page ul[data-bullet-style="diamond"] > li::before {
                content: "◆";
              }
              .ProseMirror ul[data-bullet-style="arrow"] > li::before,
              .preview-page ul[data-bullet-style="arrow"] > li::before {
                content: "➤";
              }
              .ProseMirror ul[data-bullet-style="check"] > li::before,
              .preview-page ul[data-bullet-style="check"] > li::before {
                content: "✓";
              }
              .ProseMirror ul[data-bullet-style="diamond"] > li::before,
              .preview-page ul[data-bullet-style="diamond"] > li::before,
              .ProseMirror ul[data-bullet-style="arrow"] > li::before,
              .preview-page ul[data-bullet-style="arrow"] > li::before,
              .ProseMirror ul[data-bullet-style="check"] > li::before,
              .preview-page ul[data-bullet-style="check"] > li::before {
                position: absolute;
                left: 0;
                color: var(--text-primary);
                font-weight: 700;
              }
              .ProseMirror ol[data-list-style="decimal"],
              .preview-page ol[data-list-style="decimal"] {
                list-style-type: decimal;
              }
              .ProseMirror ol[data-list-style="upper-alpha"],
              .preview-page ol[data-list-style="upper-alpha"] {
                list-style-type: upper-alpha;
              }
              .ProseMirror ol[data-list-style="lower-alpha"],
              .preview-page ol[data-list-style="lower-alpha"] {
                list-style-type: lower-alpha;
              }
              .ProseMirror ol[data-list-style="upper-roman"],
              .preview-page ol[data-list-style="upper-roman"] {
                list-style-type: upper-roman;
              }
              .ProseMirror ol[data-list-style="lower-roman"],
              .preview-page ol[data-list-style="lower-roman"] {
                list-style-type: lower-roman;
              }
              .ProseMirror ol[data-list-style="decimal-parentheses"],
              .preview-page ol[data-list-style="decimal-parentheses"],
              .ProseMirror ol[data-list-style="lower-alpha-parentheses"],
              .preview-page ol[data-list-style="lower-alpha-parentheses"] {
                list-style: none;
                counter-reset: custom-list;
                padding-left: 0;
              }
              .ProseMirror ol[data-list-style="decimal-parentheses"] > li,
              .preview-page ol[data-list-style="decimal-parentheses"] > li,
              .ProseMirror ol[data-list-style="lower-alpha-parentheses"] > li,
              .preview-page ol[data-list-style="lower-alpha-parentheses"] > li {
                position: relative;
                padding-left: 2rem;
                counter-increment: custom-list;
              }
              .ProseMirror ol[data-list-style="decimal-parentheses"] > li::before,
              .preview-page ol[data-list-style="decimal-parentheses"] > li::before {
                content: counter(custom-list) ") ";
              }
              .ProseMirror ol[data-list-style="lower-alpha-parentheses"] > li::before,
              .preview-page ol[data-list-style="lower-alpha-parentheses"] > li::before {
                content: counter(custom-list, lower-alpha) ") ";
              }
              .ProseMirror ol[data-list-style="decimal-parentheses"] > li::before,
              .preview-page ol[data-list-style="decimal-parentheses"] > li::before,
              .ProseMirror ol[data-list-style="lower-alpha-parentheses"] > li::before,
              .preview-page ol[data-list-style="lower-alpha-parentheses"] > li::before {
                position: absolute;
                left: 0;
                color: var(--text-primary);
                font-weight: 600;
              }
              .ProseMirror hr[data-page-break="manual"],
              .preview-page hr[data-page-break="manual"],
              .ProseMirror hr[data-page-break="true"],
              .preview-page hr[data-page-break="true"] {
                position: relative;
                display: block;
                width: 100%;
                border: 0;
                border-top: 2px dashed rgba(196, 154, 36, 0.45);
                margin: 1.75rem 0 2.25rem;
                break-after: column;
                page-break-after: always;
                -webkit-column-break-after: always;
              }
              .ProseMirror hr[data-page-break="manual"]::after,
              .preview-page hr[data-page-break="manual"]::after,
              .ProseMirror hr[data-page-break="true"]::after,
              .preview-page hr[data-page-break="true"]::after {
                content: "SALTO DE PÁGINA";
                position: absolute;
                left: 50%;
                bottom: -0.95rem;
                transform: translateX(-50%);
                padding: 0 0.45rem;
                background: #111C28;
                color: var(--text-tertiary);
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.08em;
                white-space: nowrap;
              }
              .ProseMirror hr[data-page-break="auto"],
              .preview-page hr[data-page-break="auto"] {
                border: 0;
                height: 0;
                margin: 0;
                opacity: 0;
                pointer-events: none;
                break-after: column;
                page-break-after: always;
                -webkit-column-break-after: always;
              }
              .ProseMirror hr:not([data-page-break]),
              .preview-page hr:not([data-page-break]) {
                display: none;
              }
              .multipage-editor-flow {
                position: absolute;
                top: ${margins.top}px;
                left: ${margins.left}px;
                width: calc(100% - ${margins.left + margins.right}px);
                height: ${contentHeight}px;
                overflow: hidden;
              }
              .multipage-editor-flow-track {
                height: ${contentHeight}px;
                transition: transform 0.25s ease;
              }
              .multipage-editor-flow .ProseMirror {
                height: ${contentHeight}px;
                width: ${flowWidth}px;
                padding: 0;
                column-width: ${contentWidth}px;
                column-gap: ${columnGap}px;
                column-fill: auto;
                outline: none;
              }
              .multipage-editor-flow .ProseMirror > * {
                break-inside: avoid;
                page-break-inside: avoid;
              }
              .multipage-page-frame {
                background: #111C28;
                min-height: ${pageHeight}px;
                box-shadow: 0 20px 50px rgba(0,0,0,0.3);
                border-radius: 2px;
                border: 1px solid rgba(255,255,255,0.05);
              }
              .multipage-page-inner {
                height: 100%;
                overflow: hidden;
              }
            `}</style>
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${visiblePageIndices.length}, minmax(0, 1fr))`,
                gap: `${pageGap}px`,
              }}
            >
              {visiblePageIndices.map((pageIndex) => (
                <div
                  key={pageIndex}
                  data-testid="editable-page-surface"
                  data-page-index={pageIndex}
                  className="multipage-page-frame relative"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    focusVisiblePage(pageIndex);
                  }}
                >
                  <div className="multipage-page-inner" style={pagePaddingStyle} />
                  <div className="pointer-events-none absolute inset-x-0 bottom-7 flex justify-center">
                    <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(7,12,20,0.05)] px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-[var(--text-tertiary)]">
                      <span aria-hidden="true" className="text-[10px] tracking-[0.08em] opacity-70">∿∿</span>
                      <span>{pageIndex + 1}</span>
                      <span aria-hidden="true" className="text-[10px] tracking-[0.08em] opacity-70">∿∿</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div
              ref={multipageFlowRef}
              className="multipage-editor-flow prose prose-invert max-w-none prose-img:rounded-lg prose-img:shadow-md"
            >
              <div
                className="multipage-editor-flow-track"
                style={{ transform: `translateX(-${flowOffset}px)` }}
              >
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>
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
