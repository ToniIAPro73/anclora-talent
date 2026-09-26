'use client';

import * as React from 'react';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Extension } from '@tiptap/core';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import { Selection, TextSelection } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TableKit } from '@tiptap/extension-table';
import { ResizableImage } from './resizable-image-extension';
import { PageBreak } from './page-break-extension';
import { FootnoteLayout, setFootnoteDecorations, type FootnoteDecorationInput } from './footnote-layout-extension';
import { FontSize } from './font-size-extension';
import type { CompositionSettings } from '@/lib/projects/composition';
import type { DocumentStyleMap, ResolvedTextStyle } from '@/lib/style-engine/model';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
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
  FileText,
  Minus,
  X,
  IndentIncrease,
  IndentDecrease,
  Undo2,
  Redo2,
} from 'lucide-react';
import { Portal } from '@/components/ui/Portal';
import { EditorPopover } from './EditorPopover';
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
import { useUiPreferences } from '@/components/providers/UiPreferencesProvider';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { resolveEditorViewportLayout, calculateSpreadFitFactor } from './editor-viewport';

type ChainedCommand = ReturnType<Editor['chain']>;
type ApplyToSelectionTarget = (command: (chain: ChainedCommand) => ChainedCommand) => boolean;

type ToolbarButtonProps = {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  dataTestId?: string;
  title: string;
  className?: string;
  ariaPressed?: boolean;
  children: React.ReactNode;
};

type ListDropdownButtonProps = {
  icon: React.ReactNode;
  title: string;
  active: boolean;
  disabled?: boolean;
  dataTestId: string;
  children: (close: () => void) => React.ReactNode;
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

const TocBlockAttributes = Extension.create({
  name: 'tocBlockAttributes',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading', 'listItem'],
        attributes: {
          tocEntry: {
            default: null,
            parseHTML: (element) =>
              element.getAttribute('data-toc-entry') === 'true' ? 'true' : null,
            renderHTML: (attributes) =>
              attributes.tocEntry ? { 'data-toc-entry': 'true' } : {},
          },
          tocLevel: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-toc-level'),
            renderHTML: (attributes) =>
              attributes.tocLevel ? { 'data-toc-level': String(attributes.tocLevel) } : {},
          },
          tocPage: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-toc-page'),
            renderHTML: (attributes) =>
              attributes.tocPage ? { 'data-toc-page': String(attributes.tocPage) } : {},
          },
        },
      },
    ];
  },
});

// StarterKit's default paragraph schema has no `attrs` beyond node content,
// so ProseMirror silently drops any `class`/`data-*` attribute on `<p>` when
// parsing imported HTML — including `class="editorial-kicker"` and
// `class="editorial-footnote"` emitted by the DOCX importer. Without this,
// every imported paragraph renders identically regardless of its editorial
// role, which is why a kicker or footnote looks just like body text.
const EDITORIAL_PARAGRAPH_CLASS_RE = /\beditorial-(kicker|footnote)\b/;

const EditorialParagraphAttributes = Extension.create({
  name: 'editorialParagraphAttributes',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph'],
        attributes: {
          editorialClass: {
            default: null,
            parseHTML: (element) => {
              const match = element.getAttribute('class')?.match(EDITORIAL_PARAGRAPH_CLASS_RE);
              return match ? match[0] : null;
            },
            renderHTML: (attributes) =>
              attributes.editorialClass ? { class: attributes.editorialClass } : {},
          },
          footnoteId: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-footnote-id'),
            renderHTML: (attributes) =>
              attributes.footnoteId ? { 'data-footnote-id': attributes.footnoteId } : {},
          },
        },
      },
    ];
  },
});

const TocInlineAttributes = Extension.create({
  name: 'tocInlineAttributes',

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          tocTitle: {
            default: null,
            parseHTML: (element) =>
              element.getAttribute('data-toc-title') === 'true' ? 'true' : null,
            renderHTML: (attributes) =>
              attributes.tocTitle ? { 'data-toc-title': 'true' } : {},
          },
          tocLeader: {
            default: null,
            parseHTML: (element) =>
              element.getAttribute('data-toc-leader') === 'true' ? 'true' : null,
            renderHTML: (attributes) =>
              attributes.tocLeader ? { 'data-toc-leader': 'true', 'aria-hidden': 'true' } : {},
          },
          tocPage: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-toc-page'),
            renderHTML: (attributes) =>
              attributes.tocPage ? { 'data-toc-page': String(attributes.tocPage) } : {},
          },
        },
      },
    ];
  },
});

const ToolbarButton = React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  function ToolbarButton(
    { onClick, active, disabled, dataTestId, title, className, ariaPressed, children },
    ref
  ) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        disabled={disabled}
        data-testid={dataTestId}
        aria-label={title}
        title={title}
        aria-pressed={ariaPressed !== undefined ? ariaPressed : (active ? true : undefined)}
        data-active={active ? 'true' : 'false'}
        className={`ac-text-editor__button focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${className ?? ''}`}
      >
        {children}
      </button>
    );
  }
);
ToolbarButton.displayName = 'ToolbarButton';

function ListDropdownButton({
  icon,
  title,
  active,
  disabled,
  dataTestId,
  children,
}: ListDropdownButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const toggle = () => {
    if (disabled) return;
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 6,
        left: Math.max(12, Math.min(rect.left, window.innerWidth - 260)),
      });
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        disabled={disabled}
        data-testid={dataTestId}
        data-active={active ? 'true' : 'false'}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={title}
        title={title}
        className="ac-text-editor__button focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        {icon}
      </button>

      {isOpen && coords && (
        <Portal>
          <div
            ref={popoverRef}
            role="menu"
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 150,
            }}
            className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface-panel)] text-[var(--text-primary)] p-2.5 shadow-[var(--shadow-lg)] animate-in fade-in zoom-in duration-150"
          >
            {children(() => setIsOpen(false))}
          </div>
        </Portal>
      )}
    </>
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

// The toolbar's font-size and color indicators only ever read
// `editor.getAttributes('textStyle')`, a TipTap *mark* created solely when a
// user manually overrides size/color. Imported and role-styled content
// (h1-h4, the editorial kicker, footnotes) carries no such mark — its size
// and color come purely from the block's role via CSS variables — so the
// indicator never changed as the cursor moved between a heading, a kicker
// and a body paragraph. This resolves the block's editorial role under the
// cursor so those indicators can fall back to the role's real style instead
// of a hardcoded default.
type EditorBlockRole = 'h1' | 'h2' | 'h3' | 'h4' | 'kicker' | 'footnote' | 'body';

function getCurrentBlockRole(editor: Editor): EditorBlockRole {
  if (editor.isActive('heading', { level: 1 })) return 'h1';
  if (editor.isActive('heading', { level: 2 })) return 'h2';
  if (editor.isActive('heading', { level: 3 })) return 'h3';
  if (editor.isActive('heading', { level: 4 })) return 'h4';

  const editorialClass = editor.getAttributes('paragraph').editorialClass as string | null | undefined;
  if (editorialClass === 'editorial-kicker') return 'kicker';
  if (editorialClass === 'editorial-footnote') return 'footnote';
  return 'body';
}

function getRoleTextStyle(
  documentStyleMap: DocumentStyleMap | null | undefined,
  role: EditorBlockRole,
): ResolvedTextStyle | undefined {
  if (!documentStyleMap) return undefined;
  switch (role) {
    case 'h1': return documentStyleMap.headings.h1;
    case 'h2': return documentStyleMap.headings.h2;
    case 'h3': return documentStyleMap.headings.h3;
    case 'h4': return documentStyleMap.headings.h4;
    case 'kicker': return documentStyleMap.kicker;
    case 'footnote': return documentStyleMap.footnote;
    default: return documentStyleMap.body;
  }
}

// Advanced Font Selector using useGoogleFonts and EditorPopover
const AdvancedFontSelector = ({
  editor,
  applyToWordOrSelection,
  isAvailable,
  unavailableTitle,
  effectiveFontFamily,
  documentStyleMap,
}: {
  editor: Editor;
  applyToWordOrSelection: ApplyToSelectionTarget;
  isAvailable: boolean;
  unavailableTitle: string;
  effectiveFontFamily?: string;
  documentStyleMap?: DocumentStyleMap | null;
}) => {
  const { locale } = useUiPreferences();
  const copy = resolveLocaleMessages(locale).editor;
  const { fonts, loadFont } = useGoogleFonts();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Read current block node type from Tiptap editor
  const blockType = editor.isActive('heading', { level: 1 })
    ? 'h1'
    : editor.isActive('heading', { level: 2 })
    ? 'h2'
    : editor.isActive('heading', { level: 3 })
    ? 'h3'
    : editor.isActive('heading', { level: 4 })
    ? 'h4'
    : 'body';

  const roleFont = documentStyleMap
    ? (blockType === 'h1'
        ? documentStyleMap.headings.h1.fontFamily
        : blockType === 'h2'
        ? documentStyleMap.headings.h2.fontFamily
        : blockType === 'h3'
        ? documentStyleMap.headings.h3.fontFamily
        : blockType === 'h4'
        ? documentStyleMap.headings.h4.fontFamily
        : documentStyleMap.body.fontFamily)
    : effectiveFontFamily?.trim() || 'Liberation Serif';

  const effectiveFont = roleFont;

  const filteredFonts = useMemo(() => {
    return fonts
      .filter((f) => f.family.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 40);
  }, [fonts, searchQuery]);

  const currentFont = editor.getAttributes('textStyle').fontFamily || effectiveFont;

  const selectFont = (fontFamily: string) => {
    loadFont(fontFamily);
    applyToWordOrSelection((chain) => chain.setFontFamily(fontFamily));
    setIsOpen(false);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => isAvailable && setIsOpen(!isOpen)}
        disabled={!isAvailable}
        data-testid="editor-toolbar-font-family-button"
        title={isAvailable ? copy.fontFamily : unavailableTitle}
        className="flex h-9 min-w-[140px] items-center justify-between gap-2 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors disabled:pointer-events-none disabled:opacity-30"
      >
        <span className="truncate">{currentFont}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <EditorPopover
        anchorRef={buttonRef}
        isOpen={isOpen && isAvailable}
        onClose={() => setIsOpen(false)}
        width={240}
        ariaLabel={copy.fontFamily}
      >
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder={copy.fontSearch}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="editor-toolbar-font-search-input"
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] py-2 pl-8 pr-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
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
            data-testid="font-option-default"
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors ${
              !editor.getAttributes('textStyle').fontFamily
                ? 'bg-[var(--accent)]/15 text-[var(--accent-text)] font-semibold'
                : 'text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span className="truncate">
              {effectiveFont} <span className="text-[10px] opacity-70">({locale === 'es' ? 'Documento' : 'Document'})</span>
            </span>
            {!editor.getAttributes('textStyle').fontFamily && <Check className="h-3 w-3 text-[var(--accent-text)]" />}
          </button>
          {filteredFonts.map((font) => (
            <button
              type="button"
              key={font.family}
              onClick={() => selectFont(font.family)}
              data-testid={`font-option-${font.family.replace(/\s+/g, '-').toLowerCase()}`}
              style={{ fontFamily: font.family }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                currentFont === font.family
                  ? 'bg-[var(--accent)]/15 text-[var(--accent-text)] font-semibold'
                  : 'text-[var(--text-primary)] hover:bg-[var(--hover)]'
              }`}
            >
              {font.family}
              {currentFont === font.family && <Check className="h-3 w-3 text-[var(--accent-text)]" />}
            </button>
          ))}
        </div>
      </EditorPopover>
    </>
  );
};

const FontSizeSelector = ({
  editor,
  onFontSizeChange,
  applyToWordOrSelection,
  isAvailable,
  unavailableTitle,
  documentStyleMap,
}: {
  editor: Editor;
  onFontSizeChange?: (size: string) => void;
  applyToWordOrSelection: ApplyToSelectionTarget;
  isAvailable: boolean;
  unavailableTitle: string;
  documentStyleMap?: DocumentStyleMap | null;
}) => {
  const { locale } = useUiPreferences();
  const copy = resolveLocaleMessages(locale).editor;
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

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

  const roleStyle = getRoleTextStyle(documentStyleMap, getCurrentBlockRole(editor));
  const roleSize = roleStyle ? `${Math.round(roleStyle.fontSizePt * (96 / 72))}px` : '16px';
  const currentSize = editor.getAttributes('textStyle')?.fontSize || roleSize;

  return (
    <>
      <ToolbarButton
        ref={buttonRef}
        onClick={() => isAvailable && setIsOpen(!isOpen)}
        disabled={!isAvailable}
        dataTestId="editor-toolbar-font-size-button"
        title={isAvailable ? copy.fontSize : unavailableTitle}
      >
        <Type className="h-4 w-4" />
      </ToolbarButton>

      <EditorPopover
        anchorRef={buttonRef}
        isOpen={isOpen && isAvailable}
        onClose={() => setIsOpen(false)}
        width={100}
        ariaLabel={copy.fontSize}
      >
        <div className="flex max-h-[260px] flex-col gap-0.5 overflow-y-auto pr-1 custom-scrollbar">
          {sizes.map((size) => (
            <button
              type="button"
              key={size.value}
              onClick={() => {
                applyToWordOrSelection((chain) => chain.setFontSize(size.value));
                onFontSizeChange?.(size.value);
                setIsOpen(false);
              }}
              data-testid={`font-size-option-${size.name}`}
              className={`px-3 py-1.5 text-xs text-left rounded-lg transition-colors ${
                currentSize === size.value
                  ? 'bg-[var(--accent)]/20 text-[var(--accent-text)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text-primary)]'
              }`}
              title={size.name}
            >
              {size.name}px
            </button>
          ))}
        </div>
      </EditorPopover>
    </>
  );
};

const ColorSelector = ({
  editor,
  applyToWordOrSelection,
  isAvailable,
  unavailableTitle,
  documentStyleMap,
}: {
  editor: Editor;
  applyToWordOrSelection: ApplyToSelectionTarget;
  isAvailable: boolean;
  unavailableTitle: string;
  documentStyleMap?: DocumentStyleMap | null;
}) => {
  const { locale } = useUiPreferences();
  const copy = resolveLocaleMessages(locale).editor;
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

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

  const roleStyle = getRoleTextStyle(documentStyleMap, getCurrentBlockRole(editor));
  const currentColor = editor.getAttributes('textStyle').color || roleStyle?.color || 'inherit';
  const currentColorName = colors.find((c) => c.value === currentColor)?.name || copy.colorDefault;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => isAvailable && setIsOpen(!isOpen)}
        disabled={!isAvailable}
        data-testid="editor-toolbar-text-color-button"
        className={`inline-flex h-9 w-9 items-center justify-center rounded-[10px] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-30 disabled:cursor-not-allowed ${
          isAvailable && currentColor !== 'inherit'
            ? 'bg-[var(--accent)] text-[var(--button-highlight-fg)] shadow-[0_0_15px_rgba(45,212,191,0.5)]'
            : isAvailable
            ? 'text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text-primary)]'
            : 'text-[var(--text-secondary)]'
        }`}
        title={isAvailable ? copy.textColor : unavailableTitle}
      >
        <Palette className="h-4 w-4" />
      </button>

      <EditorPopover
        anchorRef={buttonRef}
        isOpen={isOpen && isAvailable}
        onClose={() => setIsOpen(false)}
        width={280}
        ariaLabel={copy.textColor}
      >
        <div className="mb-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">
            Paleta de Colores
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-2">
            <div
              className="h-5 w-5 rounded border border-[var(--border-strong)]"
              style={{ backgroundColor: currentColor === 'inherit' ? 'var(--text-primary)' : currentColor }}
            />
            <span className="text-xs font-semibold text-[var(--text-primary)]">{currentColorName}</span>
          </div>
        </div>

        <div className="grid max-h-[280px] grid-cols-1 gap-1.5 overflow-y-auto pr-1 custom-scrollbar">
          {colors.map((color) => (
            <button
              type="button"
              key={color.value}
              onClick={() => {
                if (color.value === 'inherit') applyToWordOrSelection((chain) => chain.unsetColor());
                else applyToWordOrSelection((chain) => chain.setColor(color.value));
                setIsOpen(false);
              }}
              data-testid={`color-option-${color.value.replace('#', '')}`}
              className={`group flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-left transition-all duration-150 ${
                currentColor === color.value
                  ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--text-primary)]'
                  : 'border-[var(--border-subtle)] bg-[var(--surface-elevated)]/60 hover:border-[var(--accent)]/50 hover:bg-[var(--hover)]'
              }`}
              title={color.name}
            >
              <div
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[var(--border-strong)] text-[8px] font-bold text-[var(--text-primary)]"
                style={{ backgroundColor: color.value === 'inherit' ? 'transparent' : color.value }}
              >
                {color.value === 'inherit' ? '∅' : ''}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-[var(--text-primary)] leading-tight">{color.name}</div>
                <div className="text-[9px] text-[var(--text-tertiary)] truncate">{color.description}</div>
              </div>
            </button>
          ))}
        </div>
      </EditorPopover>
    </>
  );
};

const MenuBar = ({
  editor,
  viewMode,
  setViewMode,
  device,
  setDevice,
  isPhysicalMobile,
  margins,
  onMarginsChange,
  onFontSizeChange,
  wordsPerPage,
  effectiveFontFamily,
  documentStyleMap,
}: {
  editor: Editor;
  viewMode: string;
  setViewMode: React.Dispatch<React.SetStateAction<'single' | 'double'>>;
  device: string;
  isPhysicalMobile: boolean;
  setDevice: (device: 'mobile' | 'tablet' | 'desktop') => void;
  margins: MarginConfig;
  onMarginsChange: (margins: MarginConfig) => void;
  onFontSizeChange: (size: string) => void;
  wordsPerPage?: number;
  effectiveFontFamily?: string;
  documentStyleMap?: DocumentStyleMap | null;
}) => {
  const { locale } = useUiPreferences();
  const copy = resolveLocaleMessages(locale).editor;
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const selection = editor.state.selection;
  const parentText = selection.$from.parent.textContent ?? '';
  const inlineTargetAvailable =
    !selection.empty || hasUsableWordAtCursor(parentText, selection.$from.parentOffset);
  const blockTargetAvailable =
    !selection.empty || hasUsableParagraphAtCursor(parentText);
  const inlineUnavailableTitle = copy.inlineUnavailable;
  const blockUnavailableTitle = copy.blockUnavailable;
  const bulletLabels: Record<BulletStyle, string> = {
    disc: copy.bulletDisc,
    circle: copy.bulletCircle,
    square: copy.bulletSquare,
    diamond: copy.bulletDiamond,
    arrow: copy.bulletArrow,
    check: copy.bulletCheck,
  };
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
    <div className="ac-text-editor__toolbar">
      <div className="ac-text-editor__toolbar-section">
        <ToolbarButton onClick={() => setDevice('mobile')} active={device === 'mobile'} dataTestId="editor-toolbar-device-mobile-button" title={copy.deviceMobile}>
          <Smartphone className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => setDevice('tablet')} active={device === 'tablet'} dataTestId="editor-toolbar-device-tablet-button" title={copy.deviceTablet}>
          <Tablet className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => setDevice('desktop')} active={device === 'desktop'} dataTestId="editor-toolbar-device-desktop-button" title={copy.deviceDesktop}>
          <Monitor className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => setViewMode('single')}
          active={viewMode === 'single'}
          dataTestId="editor-toolbar-single-page-button"
          title={copy.singlePageMode}
          ariaPressed={viewMode === 'single'}
        >
          <FileText className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => setViewMode('double')}
          active={viewMode === 'double'}
          disabled={device === 'mobile' || isPhysicalMobile}
          dataTestId="editor-toolbar-double-page-button"
          title={isPhysicalMobile ? copy.doublePageModeUnavailable : copy.doublePageMode}
          ariaPressed={viewMode === 'double'}
        >
          <Columns className="h-4 w-4" />
        </ToolbarButton>
      </div>

      <div className="ac-text-editor__toolbar-section">
        <AdvancedFontSelector
          editor={editor}
          applyToWordOrSelection={applyToWordOrSelection}
          isAvailable={inlineTargetAvailable}
          unavailableTitle={inlineUnavailableTitle}
          effectiveFontFamily={effectiveFontFamily}
          documentStyleMap={documentStyleMap}
        />
        <FontSizeSelector
          editor={editor}
          onFontSizeChange={onFontSizeChange}
          applyToWordOrSelection={applyToWordOrSelection}
          isAvailable={inlineTargetAvailable}
          unavailableTitle={inlineUnavailableTitle}
          documentStyleMap={documentStyleMap}
        />
        <ColorSelector
          editor={editor}
          applyToWordOrSelection={applyToWordOrSelection}
          isAvailable={inlineTargetAvailable}
          unavailableTitle={inlineUnavailableTitle}
          documentStyleMap={documentStyleMap}
        />
        <MarginSelector margins={margins} onMarginsChange={onMarginsChange} wordsPerPage={wordsPerPage} />
      </div>

      <div className="ac-text-editor__toolbar-section">
        <ToolbarButton
          onClick={() => applyToWordOrSelection((chain) => chain.toggleBold())}
          active={editor.isActive('bold')}
          disabled={!inlineTargetAvailable}
          dataTestId="editor-toolbar-bold-button"
          title={inlineTargetAvailable ? copy.bold : inlineUnavailableTitle}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => applyToWordOrSelection((chain) => chain.toggleItalic())}
          active={editor.isActive('italic')}
          disabled={!inlineTargetAvailable}
          dataTestId="editor-toolbar-italic-button"
          title={inlineTargetAvailable ? copy.italic : inlineUnavailableTitle}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => applyToWordOrSelection((chain) => chain.toggleStrike())}
          active={editor.isActive('strike')}
          disabled={!inlineTargetAvailable}
          dataTestId="editor-toolbar-strikethrough-button"
          title={inlineTargetAvailable ? copy.strike : inlineUnavailableTitle}
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
      </div>

      <div className="ac-text-editor__toolbar-section">
        <ToolbarButton
          onClick={() => applyToParagraphOrSelection((chain) => chain.setTextAlign('left'))}
          active={editor.isActive({ textAlign: 'left' })}
          disabled={!blockTargetAvailable}
          dataTestId="editor-toolbar-align-left-button"
          title={blockTargetAvailable ? copy.alignLeft : blockUnavailableTitle}
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => applyToParagraphOrSelection((chain) => chain.setTextAlign('center'))}
          active={editor.isActive({ textAlign: 'center' })}
          disabled={!blockTargetAvailable}
          dataTestId="editor-toolbar-align-center-button"
          title={blockTargetAvailable ? copy.alignCenter : blockUnavailableTitle}
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => applyToParagraphOrSelection((chain) => chain.setTextAlign('right'))}
          active={editor.isActive({ textAlign: 'right' })}
          disabled={!blockTargetAvailable}
          dataTestId="editor-toolbar-align-right-button"
          title={blockTargetAvailable ? copy.alignRight : blockUnavailableTitle}
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => applyToParagraphOrSelection((chain) => chain.setTextAlign('justify'))}
          active={editor.isActive({ textAlign: 'justify' })}
          disabled={!blockTargetAvailable}
          dataTestId="editor-toolbar-align-justify-button"
          title={blockTargetAvailable ? copy.alignJustify : blockUnavailableTitle}
        >
          <AlignJustify className="h-4 w-4" />
        </ToolbarButton>
      </div>

      <div className="ac-text-editor__toolbar-section">
        <ToolbarButton
          onClick={() => applyToParagraphOrSelection((chain) => chain.toggleHeading({ level: 1 }))}
          active={editor.isActive('heading', { level: 1 })}
          disabled={!blockTargetAvailable}
          dataTestId="editor-toolbar-heading-1-button"
          title={blockTargetAvailable ? 'Encabezado 1' : blockUnavailableTitle}
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => applyToParagraphOrSelection((chain) => chain.toggleHeading({ level: 2 }))}
          active={editor.isActive('heading', { level: 2 })}
          disabled={!blockTargetAvailable}
          dataTestId="editor-toolbar-heading-2-button"
          title={blockTargetAvailable ? 'Encabezado 2' : blockUnavailableTitle}
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => applyToParagraphOrSelection((chain) => chain.toggleHeading({ level: 3 }))}
          active={editor.isActive('heading', { level: 3 })}
          disabled={!blockTargetAvailable}
          dataTestId="editor-toolbar-heading-3-button"
          title={blockTargetAvailable ? 'Encabezado 3' : blockUnavailableTitle}
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => applyToParagraphOrSelection((chain) => chain.toggleHeading({ level: 4 }))}
          active={editor.isActive('heading', { level: 4 })}
          disabled={!blockTargetAvailable}
          dataTestId="editor-toolbar-heading-4-button"
          title={blockTargetAvailable ? 'Encabezado 4' : blockUnavailableTitle}
        >
          <span className="text-[11px] font-bold">H4</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => applyToParagraphOrSelection((chain) => chain.toggleHeading({ level: 5 }))}
          active={editor.isActive('heading', { level: 5 })}
          disabled={!blockTargetAvailable}
          dataTestId="editor-toolbar-heading-5-button"
          title={blockTargetAvailable ? 'Encabezado 5' : blockUnavailableTitle}
        >
          <span className="text-[11px] font-bold">H5</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => applyToParagraphOrSelection((chain) => chain.toggleHeading({ level: 6 }))}
          active={editor.isActive('heading', { level: 6 })}
          disabled={!blockTargetAvailable}
          dataTestId="editor-toolbar-heading-6-button"
          title={blockTargetAvailable ? 'Encabezado 6' : blockUnavailableTitle}
        >
          <span className="text-[11px] font-bold">H6</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={outdentListItem}
          dataTestId="editor-toolbar-outdent-button"
          title="Tabular a la izquierda"
        >
          <IndentDecrease className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={indentListItem}
          dataTestId="editor-toolbar-indent-button"
          title="Tabular a la derecha"
        >
          <IndentIncrease className="h-4 w-4" />
        </ToolbarButton>
        <ListDropdownButton
          icon={<List className="h-4 w-4" />}
          title={copy.bulletList}
          active={editor.isActive('bulletList')}
          dataTestId="editor-toolbar-bullet-list-button"
        >
          {(close) => (
            <div className="grid grid-cols-3 gap-2 w-[240px]">
              {BULLET_STYLE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    applyBulletList(option.value);
                    close();
                  }}
                  data-testid={`bullet-style-option-${option.value}`}
                  className={`rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                    currentBulletStyle === option.value
                      ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--text-primary)]'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--accent)]/50 hover:bg-[var(--hover)]'
                  }`}
                  title={bulletLabels[option.value]}
                >
                  <div className="text-base font-semibold text-[var(--text-primary)]">{option.sample}</div>
                  <div className="mt-0.5 text-[9px] text-[var(--text-secondary)] truncate">{bulletLabels[option.value]}</div>
                </button>
              ))}
            </div>
          )}
        </ListDropdownButton>
        <ListDropdownButton
          icon={<ListOrdered className="h-4 w-4" />}
          title={copy.orderedList}
          active={editor.isActive('orderedList')}
          dataTestId="editor-toolbar-ordered-list-button"
        >
          {(close) => (
            <div className="grid grid-cols-2 gap-2 w-[220px]">
              {ORDERED_STYLE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    applyOrderedList(option.value);
                    close();
                  }}
                  data-testid={`ordered-style-option-${option.value}`}
                  className={`rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                    currentOrderedStyle === option.value
                      ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--text-primary)]'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--accent)]/50 hover:bg-[var(--hover)]'
                  }`}
                  title={option.label}
                >
                  <div className="text-sm font-semibold text-[var(--text-primary)]">{option.sample}</div>
                  <div className="mt-0.5 text-[9px] text-[var(--text-secondary)] truncate">{option.label}</div>
                </button>
              ))}
            </div>
          )}
        </ListDropdownButton>
        <ToolbarButton
          onClick={() => fileInputRef.current?.click()}
          dataTestId="editor-toolbar-insert-image-button"
          title={copy.insertImage}
        >
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          data-testid="editor-toolbar-image-file-input"
          className="hidden"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().insertContent(PAGE_BREAK_HTML).run()}
          dataTestId="editor-toolbar-insert-page-break-button"
          title={copy.insertPageBreak}
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={removeNextPageBreak}
          dataTestId="editor-toolbar-remove-page-break-button"
          title={copy.removePageBreak}
        >
          <X className="h-4 w-4" />
        </ToolbarButton>
      </div>

      <div className="ac-text-editor__toolbar-actions">
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          dataTestId="editor-toolbar-undo-button"
          title={copy.undo}
        >
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          dataTestId="editor-toolbar-redo-button"
          title={copy.redo}
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
  currentPage = 0,
  totalPages,
  onPageCountChange,
  contentZoom = 100,
  effectiveFontFamily,
  composition,
  documentStyleMap,
  compiledCssVariables,
}: {
  defaultContent: string;
  onUpdate: (html: string) => void;
  currentPage?: number;
  totalPages?: number;
  onPageCountChange?: (pages: number) => void;
  contentZoom?: number;
  effectiveFontFamily?: string;
  composition?: CompositionSettings | null;
  documentStyleMap?: DocumentStyleMap | null;
  compiledCssVariables?: Record<string, string> | null;
}) {
  const { locale } = useUiPreferences();
  const { preferences, setPreferences } = useEditorPreferences();
  const [physicalWidth, setPhysicalWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 0));
  const [containerInnerWidth, setContainerInnerWidth] = useState(0);
  const isSyncingExternalContentRef = useRef(false);
  const lastFocusedCurrentPageRef = useRef<number | null>(null);
  const multipageFlowRef = useRef<HTMLDivElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>(
    (preferences.device as 'mobile' | 'tablet' | 'desktop') || 'desktop'
  );
  // Initialize viewMode based on device - mobile should always be single
  const [viewMode, setViewMode] = useState<'single' | 'double'>(
    device === 'mobile' ? 'single' : 'double'
  );
  const effectiveFont =
    documentStyleMap?.body.fontFamily ||
    effectiveFontFamily?.trim() ||
    composition?.fontFamily?.trim() ||
    'Liberation Serif';
  const sourcePageWidth = documentStyleMap?.page.widthPt
    ? documentStyleMap.page.widthPt * (96 / 72)
    : undefined;
  const sourcePageHeight = documentStyleMap?.page.heightPt
    ? documentStyleMap.page.heightPt * (96 / 72)
    : undefined;
  const sourceMargins = documentStyleMap?.page.marginsPt
    ? {
        top: documentStyleMap.page.marginsPt.top * (96 / 72),
        bottom: documentStyleMap.page.marginsPt.bottom * (96 / 72),
        left: documentStyleMap.page.marginsPt.left * (96 / 72),
        right: documentStyleMap.page.marginsPt.right * (96 / 72),
      }
    : undefined;
  const initialMargins = composition?.margins ?? sourceMargins ?? preferences.margins ?? MARGIN_PRESETS.normal;
  const [prevCompositionMargins, setPrevCompositionMargins] = useState(composition?.margins);
  const [margins, setMargins] = useState<MarginConfig>(initialMargins);
  if (composition?.margins !== prevCompositionMargins) {
    setPrevCompositionMargins(composition?.margins);
    if (composition?.margins) {
      setMargins(composition.margins);
    }
  }

  const initialFontSize = documentStyleMap?.body.fontSizePt
    ? `${Math.round(documentStyleMap.body.fontSizePt * 1.333)}px`
    : composition?.fontSizePt
      ? `${Math.round(composition.fontSizePt * 1.333)}px`
      : (preferences.fontSize || '16px');
  const [prevCompositionFontSizePt, setPrevCompositionFontSizePt] = useState(composition?.fontSizePt);
  const [currentFontSize, setCurrentFontSize] = useState<string>(initialFontSize);
  if (composition?.fontSizePt !== prevCompositionFontSizePt) {
    setPrevCompositionFontSizePt(composition?.fontSizePt);
    if (composition?.fontSizePt) {
      setCurrentFontSize(`${Math.round(composition.fontSizePt * 1.333)}px`);
    }
  }

  const { loadFont } = useGoogleFonts();

  useEffect(() => {
    if (effectiveFont) {
      loadFont(effectiveFont);
    }
  }, [effectiveFont, loadFont]);

  useEffect(() => {
    const updatePhysicalWidth = () => setPhysicalWidth(window.innerWidth);
    updatePhysicalWidth();
    window.addEventListener('resize', updatePhysicalWidth);
    return () => window.removeEventListener('resize', updatePhysicalWidth);
  }, []);

  useEffect(() => {
    const el = contentScrollRef.current;
    if (!el) return;

    const measure = () => {
      if (el) {
        const style = window.getComputedStyle(el);
        const padLeft = parseFloat(style.paddingLeft) || 16;
        const padRight = parseFloat(style.paddingRight) || 16;
        const usable = Math.max(0, el.clientWidth - padLeft - padRight);
        if (usable > 0) {
          setContainerInnerWidth(usable);
        }
      }
    };

    measure();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const width = entry.contentRect?.width;
          if (width && width > 0) {
            setContainerInnerWidth(width);
          } else if (entry.target?.clientWidth) {
            measure();
          }
        }
      });
      ro.observe(el);
      return () => ro.disconnect();
    }

    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const publicationFormat = device === 'desktop' ? 'laptop' : device;
  const viewportLayout = useMemo(
    () => resolveEditorViewportLayout({
      physicalWidth,
      publicationDevice: publicationFormat,
      pageWidth: sourcePageWidth ?? DEVICE_PAGINATION_CONFIGS[publicationFormat].pageWidth,
      requestedViewMode: viewMode,
    }),
    [physicalWidth, publicationFormat, sourcePageWidth, viewMode],
  );
  const layoutDevice = viewportLayout.layoutDevice;
  const layoutViewMode = viewportLayout.viewMode;

  // Calculate words per page based on device, font size, and margins
  const pageConfig: PageCalculationConfig = {
    device: layoutDevice,
    fontSize: currentFontSize,
    marginTop: margins.top,
    marginBottom: margins.bottom,
    marginLeft: margins.left,
    marginRight: margins.right,
  };

  const wordsPerPage = calculateWordsPerPage(pageConfig);
  const previewFormat = layoutDevice === 'desktop' ? 'laptop' : layoutDevice;
  const previewConfig = useMemo(() => {
    const baseConfig = DEVICE_PAGINATION_CONFIGS[previewFormat];
    return {
      ...baseConfig,
      pageWidth: sourcePageWidth ?? baseConfig.pageWidth,
      pageHeight: sourcePageHeight ?? baseConfig.pageHeight,
      fontSize: Number.parseInt(currentFontSize, 10) || baseConfig.fontSize,
      marginTop: margins.top,
      marginBottom: margins.bottom,
      marginLeft: margins.left,
      marginRight: margins.right,
    };
  }, [currentFontSize, margins.bottom, margins.left, margins.right, margins.top, previewFormat, sourcePageHeight, sourcePageWidth]);
  const actualRenderablePages = useMemo(() => {
    const reconciledHtml = reconcileOverflowBreaks(defaultContent, previewConfig);
    return countRenderablePages(paginateContent(reconciledHtml, previewConfig));
  }, [defaultContent, previewConfig]);
  const totalRenderablePages = Math.max(
    1,
    Math.min(totalPages ?? actualRenderablePages, actualRenderablePages),
  );
  const spreadStartPage =
    layoutViewMode === 'double' ? Math.max(0, currentPage - (currentPage % 2)) : currentPage;
  const showSecondPage = layoutViewMode === 'double';
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
      EditorialParagraphAttributes,
      TocBlockAttributes,
      TocInlineAttributes,
      Placeholder.configure({
        placeholder: resolveLocaleMessages(locale).editor.placeholder,
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
      TableKit.configure({
        table: { resizable: false },
      }),
      FootnoteLayout,
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
  const spreadNaturalWidth = showSecondPage ? pageWidth * 2 + pageGap : pageWidth;
  const viewportWidth = spreadNaturalWidth;
  const estimatedFallbackWidth = Math.max(
    320,
    physicalWidth > 0 ? physicalWidth - 180 - 32 : 0,
  );
  const availableManuscriptWidth = containerInnerWidth > 0 ? containerInnerWidth : estimatedFallbackWidth;
  const spreadFitFactor = calculateSpreadFitFactor({
    availableWidth: availableManuscriptWidth,
    naturalWidth: spreadNaturalWidth,
  });
  const effectiveScale = zoomScale * viewportLayout.scale * spreadFitFactor;
  const effectivePages = Math.max(
    totalRenderablePages,
    showSecondPage ? spreadStartPage + 2 : spreadStartPage + 1,
  );
  const flowWidth =
    contentWidth * effectivePages +
    columnGap * Math.max(effectivePages - 1, 0);
  const flowOffset = spreadStartPage * (pageWidth + pageGap);
  const visiblePageIndices = Array.from(
    { length: showSecondPage ? 2 : 1 },
    (_, index) => spreadStartPage + index,
  );

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
      Math.ceil((occupiedWidth + 10) / (contentWidth + columnGap)),
    );

    onPageCountChange(measuredPages);
  }, [columnGap, contentWidth, onPageCountChange]);

  // Footnote paragraphs (`p.editorial-footnote`) live in the same linear
  // block flow as everything else, so left in normal CSS-column flow they
  // consume column height the source page never spent on them (Word keeps
  // footnote text in the page's footer band, outside the body's flow) —
  // every footnote pushes later content further down, compounding into a
  // growing page-count mismatch against the source document.
  //
  // This removes each footnote from normal flow and re-anchors it near the
  // bottom of whichever page it naturally falls on, so its height is
  // reclaimed by the column flow (fixing the page-count drift) while the
  // footnote still visually reads as "at the foot of its page". It is a
  // single-pass approximation, not real per-page pagination: it measures
  // each footnote's natural (in-flow) position, then removes it from flow,
  // so a footnote whose own removal shifts *later* footnotes onto a
  // different page will only be correct after the next re-run (editor
  // updates and resizes both re-run it, so it converges quickly in
  // practice, but a single keystroke can transiently show one on the
  // "wrong" page until the next pass). A footnote taller than the page's
  // bottom margin can also overlap the last line of body text — a fully
  // correct fix would need the column layout itself to reserve space for
  // it, which CSS multi-column cannot express.
  const positionFootnotes = useCallback(() => {
    if (!editor?.view || typeof editor.state?.doc?.descendants !== 'function') return;

    const proseMirror = multipageFlowRef.current?.querySelector('.ProseMirror') as HTMLElement | null;
    if (!proseMirror) return;

    const footnotes: Array<{ pos: number; nodeSize: number }> = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph' && node.attrs?.editorialClass === 'editorial-footnote') {
        footnotes.push({ pos, nodeSize: node.nodeSize });
      }
    });
    if (footnotes.length === 0) return;

    // Clear existing decorations first so each footnote's natural (in-flow)
    // position can be measured before it is pulled out of flow again below.
    setFootnoteDecorations(editor.view, []);

    const proseMirrorRect = proseMirror.getBoundingClientRect();
    const columnStride = contentWidth + columnGap;
    const stackedHeightByPage = new Map<number, number>();
    const decorations: FootnoteDecorationInput[] = [];

    for (const { pos, nodeSize } of footnotes) {
      const dom = editor.view.nodeDOM(pos) as HTMLElement | null;
      if (!dom || typeof dom.getBoundingClientRect !== 'function') continue;

      const rect = dom.getBoundingClientRect();
      const pageIndex = Math.max(0, Math.floor((rect.left - proseMirrorRect.left + 1) / columnStride));
      const stacked = stackedHeightByPage.get(pageIndex) ?? 0;
      const height = rect.height;

      decorations.push({
        pos,
        nodeSize,
        style: `position:absolute;left:${pageIndex * columnStride}px;width:${contentWidth}px;top:${Math.max(0, contentHeight - stacked - height)}px;`,
      });

      stackedHeightByPage.set(pageIndex, stacked + height + 8);
    }

    setFootnoteDecorations(editor.view, decorations);
  }, [columnGap, contentHeight, contentWidth, editor]);

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
        left: flowBounds.left + relativePageIndex * (pageWidth + pageGap) * effectiveScale + 1,
        top: flowBounds.top + 1,
      };
      const resolved = posAtCoords(coords);

      if (!resolved?.pos) {
        return;
      }

      let selectionPos = resolved.pos;

      try {
        const $resolvedPos = editor.state.doc.resolve(resolved.pos);

        for (let depth = $resolvedPos.depth; depth >= 0; depth -= 1) {
          const node = $resolvedPos.node(depth);

          if (!node.isTextblock) {
            continue;
          }

          selectionPos = $resolvedPos.start(depth);
          break;
        }

        const safeSelection = Selection.near(
          editor.state.doc.resolve(Math.max(0, Math.min(selectionPos, editor.state.doc.content.size))),
          1,
        );

        editor.view.dispatch(editor.state.tr.setSelection(safeSelection));

        if (typeof editor.view.focus === 'function') {
          editor.view.focus();
        }

        return;
      } catch {
        // Fall through to the simpler text selection path below if the
        // visual-to-document resolution cannot be normalized.
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
    [editor, effectiveScale, pageGap, pageWidth, spreadStartPage],
  );

  const scheduleLayoutPass = useCallback(() => {
    requestAnimationFrame(() => {
      positionFootnotes();
      // Removing a footnote from flow can shift later footnotes onto a
      // different page; one more pass catches that in the common case
      // without an unbounded convergence loop.
      requestAnimationFrame(() => {
        positionFootnotes();
        measureRenderablePages();
      });
    });
  }, [measureRenderablePages, positionFootnotes]);

  useEffect(() => {
    if (!editor || typeof editor.on !== 'function' || typeof editor.off !== 'function') {
      return;
    }

    scheduleLayoutPass();
    editor.on('update', scheduleLayoutPass);
    window.addEventListener('resize', scheduleLayoutPass);

    return () => {
      editor.off('update', scheduleLayoutPass);
      window.removeEventListener('resize', scheduleLayoutPass);
    };
  }, [editor, scheduleLayoutPass]);

  // The chapter-switch effect above loads new content via
  // `setContent(..., { emitUpdate: false })` (see syncEditorContent) so it
  // never fires TipTap's own 'update' event — the only event the previous
  // effect listens on. Without this, footnote repositioning and the page
  // count silently went stale on every chapter navigation, only catching up
  // if the user then typed something or resized the window.
  useEffect(() => {
    scheduleLayoutPass();
  }, [defaultContent, scheduleLayoutPass]);

  useEffect(() => {
    if (!editor || totalRenderablePages <= 1) {
      return;
    }

    if (lastFocusedCurrentPageRef.current === currentPage) {
      return;
    }

    lastFocusedCurrentPageRef.current = currentPage;
    focusVisiblePage(currentPage);
  }, [currentPage, editor, focusVisiblePage, totalRenderablePages]);

  if (!editor) return null;

  const deviceClasses = {
    mobile: 'max-w-[375px]',
    tablet: 'w-full',
    desktop: 'max-w-none w-full',
  };

  return (
    <div
      className="ac-text-editor talent-chapter-editor-shell h-full shadow-2xl"
      style={{
        '--editor-document-font': effectiveFont,
        ...(compiledCssVariables ?? {}),
      } as React.CSSProperties}
    >
      <MenuBar
        editor={editor}
        viewMode={layoutViewMode}
        setViewMode={setViewMode}
        device={device}
        isPhysicalMobile={viewportLayout.physicalDevice === 'mobile'}
        setDevice={handleDeviceChange}
        margins={margins}
        onMarginsChange={handleMarginsChange}
        onFontSizeChange={handleFontSizeChange}
        wordsPerPage={wordsPerPage}
        effectiveFontFamily={effectiveFont}
        documentStyleMap={documentStyleMap}
      />

      <div
        ref={contentScrollRef}
        className="ac-text-editor__content ac-text-editor__content--scroll flex bg-[var(--background)] p-4 custom-scrollbar"
      >
        <div
          className={`transition-all duration-300 ease-in-out m-auto shrink-0 ${deviceClasses[layoutDevice]}`}
          style={{
            width: `${viewportWidth * effectiveScale}px`,
            minHeight: `${pageHeight * effectiveScale}px`,
          }}
        >
          <div
            className="relative overflow-hidden origin-top-left"
            style={{
              width: `${viewportWidth}px`,
              minHeight: `${pageHeight}px`,
              transform: `scale(${effectiveScale})`,
              transformOrigin: 'top left',
            }}
          >
            <style>{`
              .ProseMirror {
                font-family: var(--talent-body-font, var(--editor-document-font, ${effectiveFont}));
                font-size: var(--talent-body-size, ${previewConfig.fontSize}px);
                line-height: var(--talent-body-line-height, ${composition?.lineHeight ?? previewConfig.lineHeight});
                color: var(--talent-body-color, inherit);
                word-wrap: break-word;
                overflow-wrap: break-word;
              }
              .ProseMirror img {
                max-width: 100%;
                height: auto;
                object-fit: cover;
              }
              .ProseMirror p {
                font-family: var(--talent-body-font, var(--editor-document-font, ${effectiveFont}));
                font-size: var(--talent-body-size, ${previewConfig.fontSize}px);
                line-height: var(--talent-body-line-height, ${composition?.lineHeight ?? previewConfig.lineHeight});
                text-align: var(--talent-body-align, left);
                text-indent: var(--talent-body-indent, 0);
                margin: 0;
                overflow-wrap: break-word;
                word-break: break-word;
                /* Word/LibreOffice hyphenate justified body text by default;
                   without this, justified text spreads more per line and
                   reflows into extra lines the source document didn't have. */
                -webkit-hyphens: auto;
                -ms-hyphens: auto;
                hyphens: auto;
              }
              .ProseMirror p + p,
              .preview-page p + p {
                margin-top: var(--talent-body-spacing-after, 0.8rem);
              }
              /* Indice con leader CSS: el paragraph/li tiene data-toc-entry
                 (contenedor flex) y opcionalmente data-toc-page (numero).
                 Titulo = texto plano (anon flex item, order 0).
                 ::before = puntos que rellenan (flex:1, order 1).
                 ::after  = numero de pagina desde attr() (order 2). */
              .ProseMirror [data-toc-entry="true"],
              .preview-page [data-toc-entry="true"] {
                display: flex;
                align-items: baseline;
                gap: 0;
                margin: 0;
                padding: 0;
                white-space: nowrap;
                list-style: none;
                line-height: 1.5;
              }
              .ProseMirror [data-toc-entry="true"][data-toc-page]::before,
              .preview-page [data-toc-entry="true"][data-toc-page]::before {
                content: "······································································································";
                order: 1;
                flex: 1 1 auto;
                overflow: hidden;
                margin: 0 0.35em;
                letter-spacing: 0.15em;
                color: inherit;
                white-space: nowrap;
                font-variant-numeric: tabular-nums;
              }
              .ProseMirror [data-toc-entry="true"][data-toc-page]::after,
              .preview-page [data-toc-entry="true"][data-toc-page]::after {
                content: attr(data-toc-page);
                order: 2;
                flex: 0 0 auto;
                font-variant-numeric: tabular-nums;
              }
              .ProseMirror li[data-toc-entry="true"],
              .preview-page li[data-toc-entry="true"] {
                list-style: none;
                margin-left: 0;
                padding-left: 0;
              }
              .ProseMirror ul.toc-list,
              .preview-page ul.toc-list {
                list-style: none;
                margin: 0;
                padding: 0;
              }
              .ProseMirror h1,
              .preview-page h1 {
                font-family: var(--talent-h1-font, inherit);
                font-size: var(--talent-h1-size, 2rem);
                line-height: var(--talent-h1-line-height, 1.1);
                font-weight: var(--talent-h1-weight, 800);
                margin: var(--talent-h1-spacing-before, 0) 0 var(--talent-h1-spacing-after, 1rem) 0;
                color: var(--talent-h1-color, var(--text-primary));
              }
              .ProseMirror h2,
              .preview-page h2 {
                font-family: var(--talent-h2-font, inherit);
                font-size: var(--talent-h2-size, 1.5rem);
                line-height: var(--talent-h2-line-height, 1.2);
                font-weight: var(--talent-h2-weight, 750);
                margin: var(--talent-h2-spacing-before, 0) 0 var(--talent-h2-spacing-after, 0.85rem) 0;
                color: var(--talent-h2-color, var(--text-primary));
              }
              .ProseMirror h3,
              .preview-page h3 {
                font-family: var(--talent-h3-font, inherit);
                font-size: var(--talent-h3-size, 1.2rem);
                line-height: var(--talent-h3-line-height, 1.3);
                font-weight: var(--talent-h3-weight, 700);
                margin: var(--talent-h3-spacing-before, 0) 0 var(--talent-h3-spacing-after, 0.75rem) 0;
                color: var(--talent-h3-color, var(--text-primary));
              }
              .ProseMirror h4,
              .preview-page h4 {
                font-family: var(--talent-h4-font, inherit);
                font-size: var(--talent-h4-size, 1.05rem);
                line-height: var(--talent-h4-line-height, 1.35);
                font-weight: var(--talent-h4-weight, 700);
                margin: var(--talent-h4-spacing-before, 0) 0 var(--talent-h4-spacing-after, 0.65rem) 0;
                color: var(--talent-h4-color, var(--text-primary));
              }
              .ProseMirror blockquote,
              .preview-page blockquote {
                font-family: var(--talent-quote-font, inherit);
                font-size: var(--talent-quote-size, inherit);
                color: var(--talent-quote-color, inherit);
                border-left-style: solid;
                border-left-color: var(--talent-quote-border-color, #d97706);
                border-left-width: var(--talent-quote-border-width, 3px);
                margin: 1rem 1.5rem 1rem 0;
                padding: 0.15rem 0 0.15rem 1rem;
              }
              .ProseMirror table,
              .preview-page table {
                /* !important: imported .docx tables carry an inline width
                   (from the source Word column widths) that otherwise wins
                   by specificity and lets the table bleed past the column
                   edge. */
                width: ${contentWidth}px !important;
                max-width: ${contentWidth}px !important;
                table-layout: fixed;
                border-collapse: collapse;
                margin: 0.5rem 0 1rem 0;
                font-size: var(--talent-body-size, inherit);
                /* Tables taller than the remaining column space must move
                   whole to the next column — a mid-table split makes
                   Chromium bleed the tail past the column's right edge
                   instead of wrapping it. */
                break-inside: avoid-column;
                -webkit-column-break-inside: avoid;
              }
              .ProseMirror th,
              .preview-page th {
                background: var(--talent-table-header-bg, rgba(0,0,0,0.04));
                color: var(--talent-table-header-color, inherit);
                font-family: var(--talent-table-header-font, inherit);
                font-size: var(--talent-table-header-size, inherit);
                font-weight: 700;
                text-align: left;
              }
              .ProseMirror td,
              .preview-page td {
                background: transparent;
                color: var(--talent-table-cell-color, inherit);
                font-family: var(--talent-table-cell-font, inherit);
                font-size: var(--talent-table-cell-size, inherit);
              }
              .ProseMirror tbody tr:nth-child(even) td,
              .preview-page tbody tr:nth-child(even) td {
                background: var(--talent-table-band-bg, transparent);
              }
              .ProseMirror td,
              .ProseMirror th,
              .preview-page td,
              .preview-page th {
                border: 1px solid var(--talent-table-border-color, var(--border-subtle, rgba(0,0,0,0.12)));
                padding: 0.4rem 0.6rem;
                word-wrap: break-word;
                overflow-wrap: break-word;
                vertical-align: top;
              }
              .ProseMirror p.editorial-kicker,
              .preview-page p.editorial-kicker {
                font-family: var(--talent-kicker-font, inherit);
                font-size: var(--talent-kicker-size, 0.8rem);
                font-weight: var(--talent-kicker-weight, 700);
                color: var(--talent-kicker-color, var(--text-secondary));
                letter-spacing: 0.08em;
                text-transform: uppercase;
                margin: 0 0 0.25rem 0;
              }
              .ProseMirror p.editorial-footnote,
              .preview-page p.editorial-footnote {
                font-family: var(--talent-footnote-font, inherit);
                font-size: var(--talent-footnote-size, 0.8rem) !important;
                color: var(--talent-footnote-color, var(--text-tertiary));
                line-height: 1.3 !important;
                margin: 0.85rem 0 1rem 0 !important;
                padding-top: 0.5rem;
                border-top: 1px solid var(--talent-footnote-color, var(--border-strong, rgba(0,0,0,0.3)));
                max-width: 45%;
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
                background: transparent;
                color: #172238;
              }
              .multipage-editor-flow-track {
                height: ${contentHeight}px;
                transition: transform 0.25s ease;
              }
              .multipage-editor-flow .ProseMirror {
                position: relative;
                height: ${contentHeight}px;
                width: ${flowWidth}px;
                padding: 0;
                color: var(--talent-body-color, #172238);
                font-family: var(--talent-body-font, var(--editor-document-font, ${effectiveFont}, Georgia, 'Times New Roman', serif));
                font-size: var(--talent-body-size, 18px);
                line-height: var(--talent-body-line-height, 1.55);
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
                background: #f4f0e8;
                color: #172238;
                min-height: ${pageHeight}px;
                box-shadow: var(--shadow-lg, 0 20px 50px rgba(0,0,0,0.15));
                border-radius: 2px;
                border: 1px solid var(--border-subtle, rgba(255,255,255,0.05));
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
              lang={locale}
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

      <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-panel)] px-6 py-2.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
        <div className="flex gap-6">
          <span className="flex items-center gap-1.5"><Type className="h-3 w-3" /> {editor.storage.characterCount.words()} palabras</span>
          <span className="flex items-center gap-1.5"><Baseline className="h-3 w-3" /> {editor.storage.characterCount.characters()} caracteres</span>
        </div>
        <div className="text-[var(--accent-text)]">Premium Editor Active</div>
      </div>
    </div>
  );
}
