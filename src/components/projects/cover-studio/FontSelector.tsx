'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { useGoogleFonts } from '@/hooks/use-google-fonts';
import { Input } from '@/components/ui/input';
import { cssFontFamily } from '@/lib/style-engine/font-registry';

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
    placement: 'up' | 'down';
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

  const updateDropdownPosition = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const safeMargin = 8;
    const gap = 6;
    const preferredHeight = 340;
    const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - safeMargin - gap);
    const spaceAbove = Math.max(0, rect.top - safeMargin - gap);
    const shouldOpenUp = spaceAbove >= preferredHeight && spaceBelow < preferredHeight
      ? true
      : spaceBelow >= preferredHeight && spaceAbove < preferredHeight
        ? false
        : spaceAbove > spaceBelow;
    const availableHeight = shouldOpenUp ? spaceAbove : spaceBelow;
    const maxHeight = Math.min(preferredHeight, availableHeight);
    const maxWidth = Math.max(0, window.innerWidth - safeMargin * 2);
    const preferredWidth = compact ? 280 : 300;
    const width = Math.min(maxWidth, Math.max(rect.width, preferredWidth));
    const left = Math.max(safeMargin, Math.min(rect.left, window.innerWidth - width - safeMargin));
    const position = {
      left,
      width,
      maxHeight,
      placement: (shouldOpenUp ? 'up' : 'down') as 'up' | 'down',
      ...(shouldOpenUp
        ? { bottom: window.innerHeight - rect.top + gap }
        : { top: rect.bottom + gap }),
    };

    setOpenUp(shouldOpenUp);
    setDropdownPosition((current) => (
      current && Object.keys(position).every((key) => current[key as keyof typeof current] === position[key as keyof typeof position])
        ? current
        : position
    ));
  }, [compact]);

  const handleSelectFont = (fontFamily: string) => {
    loadFont(fontFamily);
    onFontSelect(fontFamily);
    setIsOpen(false);
    setSearchQuery('');
  };

  useEffect(() => {
    if (!isOpen) return;
    const updatePosition = () => updateDropdownPosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    window.visualViewport?.addEventListener('resize', updatePosition);
    window.visualViewport?.addEventListener('scroll', updatePosition);
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      window.visualViewport?.removeEventListener('resize', updatePosition);
      window.visualViewport?.removeEventListener('scroll', updatePosition);
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen, updateDropdownPosition]);

  const handleOpenDropdown = () => {
    updateDropdownPosition();
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
        <span className="truncate" style={{ fontFamily: cssFontFamily(selectedFont) }}>{selectedFont}</span>
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
          data-placement={dropdownPosition.placement}
          style={{
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            top: dropdownPosition.top,
            bottom: dropdownPosition.bottom,
            maxHeight: dropdownPosition.maxHeight,
            backgroundColor: 'var(--surface-elevated)',
          }}
        >
          <div className="font-selector-search-row shrink-0 border-b border-[var(--border-subtle)] p-2">
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
                className="font-selector-search-input h-7 pl-2 pr-7 text-xs bg-[var(--surface-soft)] border-[var(--border-subtle)]"
                autoFocus
              />
            </div>
          </div>

          <div
            className="font-selector-categories flex shrink-0 gap-1 overflow-x-auto border-b border-[var(--border-subtle)] px-2 py-1.5"
            data-compact="true"
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
                className={`font-selector-category h-6 shrink-0 rounded px-2 text-[11px] font-medium capitalize leading-none transition-colors ${
                  activeCategory === cat
                    ? 'bg-[var(--talent-button-selected-bg)] text-[var(--talent-button-selected-fg)]'
                    : 'bg-[var(--surface-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-highlight)]'
                }`}
              >
                {cat === 'all' ? 'Todos' : cat === 'sans-serif' ? 'Sans' : cat === 'monospace' ? 'Mono' : cat}
              </button>
            ))}
          </div>

          <div ref={listRef} className="font-selector-list min-h-0 flex-1 overflow-y-auto p-1" data-testid="font-selector-list" role="listbox">
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
                      ? 'bg-[var(--talent-button-selected-bg)] font-semibold text-[var(--talent-button-selected-fg)]'
                      : index === activeIndex
                        ? 'bg-[var(--surface-highlight)] text-[var(--text-primary)]'
                        : 'text-[var(--text-primary)] hover:bg-[var(--surface-highlight)]'
                  }`}
                >
                  <span className="truncate" style={{ fontFamily: cssFontFamily(font.family) }}>{font.family}</span>
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
