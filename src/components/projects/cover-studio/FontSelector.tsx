'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { useGoogleFonts } from '@/hooks/use-google-fonts';
import { Input } from '@/components/ui/input';

interface FontSelectorProps {
  selectedFont: string;
  onFontSelect: (fontFamily: string) => void;
  /** Dense trigger (28-32px) for the 08A properties panel. */
  compact?: boolean;
}

export function FontSelector({
  selectedFont,
  onFontSelect,
  compact = false,
}: FontSelectorProps) {
  const { fonts, loadFont } = useGoogleFonts();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [openUp, setOpenUp] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{
    left: number;
    width: number;
    top?: number;
    bottom?: number;
    maxHeight: number;
    listMaxHeight: number;
  } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectableFonts = useMemo(() => {
    if (!selectedFont || fonts.some((font) => font.family === selectedFont)) return fonts;
    return [
      { family: selectedFont, variants: ['400'], category: 'system', kind: 'system' },
      ...fonts,
    ];
  }, [fonts, selectedFont]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(selectableFonts.map((f) => f.category));
    return Array.from(cats).sort();
  }, [selectableFonts]);

  // Filter fonts based on search and category
  const displayedFonts = useMemo(() => {
    let result = selectableFonts;

    if (activeCategory !== 'all') {
      result = result.filter((f) => f.category === activeCategory);
    }

    if (searchQuery.trim()) {
      result = result.filter((f) =>
        f.family.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Keep the complete filtered collection available to the list. The list
    // itself is scrollable, so users can reach every family returned by the
    // configured font source instead of silently stopping at the first 50.
    return result;
  }, [selectableFonts, searchQuery, activeCategory]);

  useEffect(() => {
    if (!isOpen) return;
    listRef.current?.querySelector<HTMLElement>('[data-active-option="true"]')?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, isOpen]);

  const handleSelectFont = (fontFamily: string) => {
    loadFont(fontFamily);
    onFontSelect(fontFamily);
    setIsOpen(false);
    setSearchQuery('');
  };

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  const handleOpenDropdown = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = Math.max(0, window.innerHeight - rect.bottom);
      const spaceAbove = Math.max(0, rect.top);

      // Si hay más espacio arriba (y menos de 300px abajo), abrir hacia arriba
      const shouldOpenUp = spaceAbove > spaceBelow;
      if (shouldOpenUp) {
        setOpenUp(true);
      } else {
        setOpenUp(false);
      }
      // The panel is a flex column (search + categories + list): only the
      // list scrolls (flex-1 / min-h-0), so its height can never be eaten by
      // the chrome above it and the last family is always reachable.
      const available = Math.max(200, (shouldOpenUp ? spaceAbove : spaceBelow) - 16);
      const maxHeight = Math.min(340, available);
      const width = Math.min(Math.max(rect.width, 260), window.innerWidth - 16);
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      setDropdownPosition({
        left,
        width,
        maxHeight,
        listMaxHeight: maxHeight,
        ...(shouldOpenUp
          ? { bottom: window.innerHeight - rect.top + 6 }
          : { top: rect.bottom + 6 }),
      });
    }
    setIsOpen(true);
  };

  return (
    <div className={`relative w-full${isOpen ? ' font-selector--open' : ''}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : handleOpenDropdown())}
        data-testid="font-selector-toggle"
        className={`w-full ${compact ? 'h-8 px-2.5 rounded-md text-xs' : 'h-10 px-3 rounded-lg text-sm'} border border-[var(--border-subtle)] bg-[var(--surface-soft)] text-[var(--text-primary)] flex items-center justify-between hover:bg-[var(--surface-highlight)] transition-colors`}
      >
        <span className="truncate" style={{ fontFamily: selectedFont }}>{selectedFont}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${
            isOpen ? (openUp ? '-rotate-180' : 'rotate-180') : ''
          }`}
        />
      </button>

      {isOpen && dropdownPosition && (
        <div
          className="fixed z-[100] flex flex-col overflow-hidden rounded-lg border border-[var(--border-strong)] shadow-2xl"
          data-testid="font-selector-dropdown"
          style={{
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            top: dropdownPosition.top,
            bottom: dropdownPosition.bottom,
            maxHeight: dropdownPosition.maxHeight,
            backgroundColor: 'var(--surface-elevated)',
          }}
        >
          <div className="shrink-0 border-b border-[var(--border-subtle)] p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1.5 h-3.5 w-3.5 text-[var(--text-tertiary)]" />
              <Input
                placeholder="Busca fuentes..."
                data-testid="font-selector-search-input"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActiveIndex((i) => Math.min(displayedFonts.length - 1, i + 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActiveIndex((i) => Math.max(0, i - 1));
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const font = displayedFonts[activeIndex];
                    if (font) handleSelectFont(font.family);
                  }
                }}
                className="h-7 pl-2 pr-7 text-xs bg-[var(--surface-soft)] border-[var(--border-subtle)]"
                autoFocus
              />
            </div>
          </div>

          <div
            className="flex shrink-0 gap-1 overflow-x-auto border-b border-[var(--border-subtle)] px-2 py-1.5"
            data-testid="font-selector-categories"
          >
            {['all', ...categories].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setActiveCategory(cat);
                  setActiveIndex(0);
                }}
                data-testid={`font-selector-category-${cat}-button`}
                className={`h-6 shrink-0 rounded px-2 text-[11px] font-medium capitalize leading-none transition-colors ${
                  activeCategory === cat
                    ? 'bg-[var(--accent)] text-black'
                    : 'bg-[var(--surface-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-highlight)]'
                }`}
              >
                {cat === 'all' ? 'Todos' : cat === 'sans-serif' ? 'Sans' : cat === 'monospace' ? 'Mono' : cat}
              </button>
            ))}
          </div>

          <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-1" data-testid="font-selector-list" role="listbox">
            {displayedFonts.length === 0 ? (
              <div className="py-4 text-center text-xs text-[var(--text-secondary)]">No se encontraron fuentes</div>
            ) : (
              displayedFonts.map((font, index) => (
                <button
                  key={font.family}
                  type="button"
                  role="option"
                  aria-selected={selectedFont === font.family}
                  data-active-option={index === activeIndex ? 'true' : 'false'}
                  onClick={() => handleSelectFont(font.family)}
                  onMouseMove={() => index !== activeIndex && setActiveIndex(index)}
                  data-testid={`font-option-${font.family.replace(/\s+/g, '-').toLowerCase()}`}
                  className={`flex h-7 w-full items-center gap-2 rounded px-2 text-left text-xs transition-colors ${
                    selectedFont === font.family
                      ? 'bg-[var(--accent)] font-semibold text-black'
                      : index === activeIndex
                        ? 'bg-[var(--surface-highlight)] text-[var(--text-primary)]'
                        : 'text-[var(--text-primary)] hover:bg-[var(--surface-highlight)]'
                  }`}
                >
                  <span className="truncate" style={{ fontFamily: font.family }}>{font.family}</span>
                  <span className="ml-auto shrink-0 text-[10px] opacity-60">{font.category}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
