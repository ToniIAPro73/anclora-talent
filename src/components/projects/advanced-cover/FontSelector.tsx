'use client';

import { useState, useMemo, useRef } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { useGoogleFonts } from '@/hooks/use-google-fonts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { GoogleFont } from '@/hooks/use-google-fonts';

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
  const containerRef = useRef<HTMLDivElement>(null);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(fonts.map((f) => f.category));
    return Array.from(cats).sort();
  }, [fonts]);

  // Filter fonts based on search and category
  const displayedFonts = useMemo(() => {
    let result = fonts;

    if (activeCategory !== 'all') {
      result = result.filter((f) => f.category === activeCategory);
    }

    if (searchQuery.trim()) {
      result = result.filter((f) =>
        f.family.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return result.slice(0, 50); // Limit to 50 for performance
  }, [fonts, searchQuery, activeCategory]);

  const handleSelectFont = (fontFamily: string) => {
    loadFont(fontFamily);
    onFontSelect(fontFamily);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleOpenDropdown = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      // Si hay más espacio arriba (y menos de 300px abajo), abrir hacia arriba
      if (spaceAbove > 350 && spaceBelow < 350) {
        setOpenUp(true);
      } else {
        setOpenUp(false);
      }
    }
    setIsOpen(true);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        onClick={() => (isOpen ? setIsOpen(false) : handleOpenDropdown())}
        className="w-full h-10 px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-soft)] text-[var(--text-primary)] text-sm flex items-center justify-between hover:bg-[var(--surface-highlight)] transition-colors"
      >
        <span className="truncate">{selectedFont}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${
            isOpen ? (openUp ? '-rotate-180' : 'rotate-180') : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className={`absolute left-0 right-0 z-50 border border-[var(--border-subtle)] rounded-lg shadow-2xl ${
          openUp ? 'bottom-12' : 'top-12'
        }`} style={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(12px)' }}>
          {/* Search */}
          <div className="p-3 border-b border-[var(--border-subtle)]">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-[var(--text-tertiary)]" />
              <Input
                placeholder="Busca fuentes..."
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
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 text-xs rounded font-medium transition-all ${
                activeCategory === 'all'
                  ? 'bg-[var(--accent-mint)] text-black shadow-md'
                  : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
              }`}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 text-xs rounded capitalize font-medium transition-all ${
                  activeCategory === cat
                    ? 'bg-[var(--accent-mint)] text-black shadow-md'
                    : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                }`}
              >
                {cat === 'sans-serif' ? 'Sans' : cat === 'monospace' ? 'Mono' : cat}
              </button>
            ))}
          </div>

          {/* Font List */}
          <div className="max-h-80 overflow-y-auto p-2" style={{ backgroundColor: 'rgba(5, 12, 25, 0.8)' }}>
            {displayedFonts.length === 0 ? (
              <div className="text-center py-6 text-slate-300 text-sm font-medium">
                No se encontraron fuentes
              </div>
            ) : (
              <div className="space-y-1.5">
                {displayedFonts.map((font) => (
                  <button
                    key={font.family}
                    onClick={() => handleSelectFont(font.family)}
                    className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-all ${
                      selectedFont === font.family
                        ? 'bg-[var(--accent-mint)] text-black font-bold shadow-md'
                        : 'hover:bg-slate-700 text-slate-100 hover:text-white'
                    }`}
                    style={{ fontFamily: font.family }}
                  >
                    <div className="font-semibold">{font.family}</div>
                    <div className="text-xs text-slate-300 mt-0.5">
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

      {/* Close on click outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
