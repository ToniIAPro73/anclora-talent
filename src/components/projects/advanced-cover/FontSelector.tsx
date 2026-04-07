'use client';

import { useState, useEffect } from 'react';
import { Search, X, Type } from 'lucide-react';
import { useGoogleFonts } from '@/hooks/use-google-fonts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { GoogleFont } from '@/hooks/use-google-fonts';

interface FontSelectorProps {
  selectedFont: string;
  onFontSelect: (fontFamily: string) => void;
  triggerLabel?: string;
}

export function FontSelector({
  selectedFont,
  onFontSelect,
  triggerLabel = 'Tipografía',
}: FontSelectorProps) {
  const { fonts, loading, loadFont, searchFonts, getFontsByCategory, getCategories } =
    useGoogleFonts();

  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [displayedFonts, setDisplayedFonts] = useState<GoogleFont[]>(fonts);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const categories = getCategories();

  // Update displayed fonts based on search and category
  useEffect(() => {
    let result = fonts;

    if (activeCategory !== 'all') {
      result = getFontsByCategory(activeCategory);
    }

    if (searchQuery.trim()) {
      result = result.filter((f) =>
        f.family.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setDisplayedFonts(result);
  }, [searchQuery, activeCategory, fonts, searchFonts, getFontsByCategory]);

  const handleSelectFont = (fontFamily: string) => {
    loadFont(fontFamily);
    onFontSelect(fontFamily);
    setOpen(false);
    setSearchQuery('');
    setActiveCategory('all');
  };

  // Extract font name for display (remove Google Fonts variants)
  const getDisplayName = (fontFamily: string) => {
    return fontFamily.replace(/[0-9]/g, '').trim();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 bg-[var(--surface-soft)] border-[var(--border-subtle)] hover:bg-[var(--surface-highlight)]"
        >
          <Type className="h-4 w-4" />
          <span className="truncate text-sm">{getDisplayName(selectedFont)}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[80vh] bg-[var(--page-surface)] border-[var(--border-subtle)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--text-primary)] flex items-center gap-2">
            <Type className="h-5 w-5" />
            Selecciona una Tipografía
          </DialogTitle>
          <DialogDescription className="text-[var(--text-secondary)]">
            Explora cientos de fuentes premium. Usa búsqueda o filtra por categoría.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--text-tertiary)]" />
            <Input
              placeholder="Busca fuentes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[var(--surface-soft)] border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          {categories.length > 0 && (
            <Tabs
              value={activeCategory}
              onValueChange={setActiveCategory}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-5 gap-2 bg-[var(--surface-soft)] p-1">
                <TabsTrigger
                  value="all"
                  className="text-xs data-[state=active]:bg-[var(--accent-mint)] data-[state=active]:text-black"
                >
                  Todos
                </TabsTrigger>
                {categories.map((cat) => (
                  <TabsTrigger
                    key={cat}
                    value={cat}
                    className="text-xs capitalize data-[state=active]:bg-[var(--accent-mint)] data-[state=active]:text-black"
                  >
                    {cat === 'sans-serif' ? 'Sans' : cat === 'monospace' ? 'Mono' : cat}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={activeCategory} className="mt-4">
                {loading ? (
                  <div className="text-center py-8 text-[var(--text-tertiary)]">
                    Cargando fuentes...
                  </div>
                ) : displayedFonts.length === 0 ? (
                  <div className="text-center py-8 text-[var(--text-tertiary)]">
                    No se encontraron fuentes
                  </div>
                ) : (
                  <ScrollArea className="h-[400px] w-full rounded-lg border border-[var(--border-subtle)] p-4">
                    <div className="space-y-2">
                      {displayedFonts.map((font) => (
                        <button
                          key={font.family}
                          onClick={() => handleSelectFont(font.family)}
                          className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                            selectedFont === font.family
                              ? 'bg-[var(--accent-mint)] text-black font-semibold'
                              : 'bg-[var(--surface-soft)] text-[var(--text-primary)] hover:bg-[var(--surface-highlight)]'
                          }`}
                          style={{ fontFamily: font.family }}
                        >
                          <div className="font-semibold text-sm">{font.family}</div>
                          <div className="text-xs opacity-70 capitalize">
                            {font.category}
                            {font.variants.length > 1 &&
                              ` • ${font.variants.length} estilos`}
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>
          )}

          {/* Info */}
          <div className="text-xs text-[var(--text-tertiary)] bg-[var(--surface-soft)] rounded-lg p-3">
            💡 Selecciona una fuente para aplicarla al texto seleccionado. El cambio se aplica
            instantáneamente en el lienzo.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
