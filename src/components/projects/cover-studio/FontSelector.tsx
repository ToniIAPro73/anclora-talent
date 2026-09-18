'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { useGoogleFonts } from '@/hooks/use-google-fonts';
import { Input } from '@/components/ui/input';

interface FontSelectorProps {
  selectedFont: string;
  onFontSelect: (fontFamily: string) => void;
}

export function FontSelector({
  selectedFont,
  onFontSelect,
}: FontSelectorProps) {
  const { fonts, loadFont } = useGoogleFonts();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [openUp, setOpenUp] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ left: number; width: number; top?: number; bottom?: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

    return result.slice(0, 50); // Limit to 50 for performance
  }, [selectableFonts, searchQuery, activeCategory]);

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
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      // Si hay más espacio arriba (y menos de 300px abajo), abrir hacia arriba
      const shouldOpenUp = spaceAbove > 350 && spaceBelow < 350;
      if (shouldOpenUp) {
        setOpenUp(true);
      } else {
        setOpenUp(false);
      }
      setDropdownPosition({
        left: rect.left,
        width: rect.width,
        ...(shouldOpenUp
          ? { bottom: window.innerHeight - rect.top + 8 }
          : { top: rect.bottom + 8 }),
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
        className="w-full h-10 px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-soft)] text-[var(--text-primary)] text-sm flex items-center justify-between hover:bg-[var(--surface-highlight)] transition-colors"
      >
        <span className="truncate" style={{ fontFamily: selectedFont }}>{selectedFont}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${
            isOpen ? (openUp ? '-rotate-180' : 'rotate-180') : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className="fixed z-[100] rounded-xl border border-[var(--border-strong)] shadow-2xl"
          style={{ ...dropdownPosition, backgroundColor: 'var(--surface-elevated)', backdropFilter: 'blur(16px)' }}
        >
          {/* Search */}
          <div className="p-3 border-b border-[var(--border-subtle)]">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-[var(--text-tertiary)]" />
              <Input
                placeholder="Busca fuentes..."
                data-testid="font-selector-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm bg-[var(--surface-soft)] border-[var(--border-subtle)]"
                autoFocus
              />
            </div>
          </div>

          {/* Categories */}
          <div className="flex gap-2 p-3 border-b border-[var(--border-subtle)] flex-wrap" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)' }}>
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              data-testid="font-selector-category-all-button"
              className={`px-3 py-1.5 text-xs rounded font-medium transition-all ${
                activeCategory === 'all'
                  ? 'bg-[var(--accent)] text-black shadow-md'
                  : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
              }`}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                data-testid={`font-selector-category-${cat}-button`}
                className={`px-3 py-1.5 text-xs rounded capitalize font-medium transition-all ${
                  activeCategory === cat
                    ? 'bg-[var(--accent)] text-black shadow-md'
                    : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                }`}
              >
                {cat === 'sans-serif' ? 'Sans' : cat === 'monospace' ? 'Mono' : cat}
              </button>
            ))}
          </div>

          {/* Font List */}
          <div className="max-h-64 overflow-y-auto p-2" style={{ backgroundColor: 'color-mix(in srgb, var(--surface-canvas) 88%, transparent)' }}>
            {displayedFonts.length === 0 ? (
              <div className="text-center py-6 text-slate-300 text-sm font-medium">
                No se encontraron fuentes
              </div>
            ) : (
              <div className="space-y-1.5">
                {displayedFonts.map((font) => (
                  <button
                    key={font.family}
                    type="button"
                    onClick={() => handleSelectFont(font.family)}
                    data-testid={`font-option-${font.family.replace(/\s+/g, '-').toLowerCase()}`}
                    className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-all ${
                      selectedFont === font.family
                        ? 'bg-[var(--accent)] text-black font-bold shadow-md'
                        : 'hover:bg-slate-700 text-slate-100 hover:text-white'
                    }`}
                    style={{ fontFamily: font.family }}
                  >
                    <div className="font-semibold" style={{ fontFamily: font.family }}>{font.family}</div>
                    <div className="mt-0.5 text-xs text-slate-300" style={{ fontFamily: font.family }}>
                      {font.category}
                      {font.variants.length > 1 && ` • ${font.variants.length} estilos`}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
