/**
 * Hook para gestionar y cargar fuentes de Google Fonts
 * Proporciona búsqueda, categorización y carga dinámica de fuentes
 */

import { useState, useEffect, useCallback } from 'react';

export interface GoogleFont {
  family: string;
  variants: string[];
  category: string;
  kind: string;
}

const GOOGLE_FONTS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_FONTS_API_KEY || '';

// Fuentes predeterminadas si la API no está disponible
const DEFAULT_FONTS: GoogleFont[] = [
  // Serif
  { family: 'Libre Baskerville', variants: ['400', '700'], category: 'serif', kind: 'webfont' },
  { family: 'Playfair Display', variants: ['400', '700', '900'], category: 'serif', kind: 'webfont' },
  { family: 'Lora', variants: ['400', '700'], category: 'serif', kind: 'webfont' },
  { family: 'Merriweather', variants: ['400', '700'], category: 'serif', kind: 'webfont' },
  { family: 'Crimson Text', variants: ['400', '700'], category: 'serif', kind: 'webfont' },
  { family: 'Cormorant Garamond', variants: ['400', '700'], category: 'serif', kind: 'webfont' },
  { family: 'EB Garamond', variants: ['400', '700'], category: 'serif', kind: 'webfont' },
  { family: 'Dosis', variants: ['400', '700'], category: 'serif', kind: 'webfont' },
  { family: 'Bodoni Moda', variants: ['400', '700'], category: 'serif', kind: 'webfont' },
  { family: 'Abril Fatface', variants: ['400'], category: 'serif', kind: 'webfont' },

  // Sans-Serif
  { family: 'Inter', variants: ['400', '700'], category: 'sans-serif', kind: 'webfont' },
  { family: 'Poppins', variants: ['400', '700'], category: 'sans-serif', kind: 'webfont' },
  { family: 'Raleway', variants: ['400', '700'], category: 'sans-serif', kind: 'webfont' },
  { family: 'Roboto', variants: ['400', '700'], category: 'sans-serif', kind: 'webfont' },
  { family: 'Montserrat', variants: ['400', '700'], category: 'sans-serif', kind: 'webfont' },
  { family: 'Oswald', variants: ['400', '700'], category: 'sans-serif', kind: 'webfont' },
  { family: 'Open Sans', variants: ['400', '700'], category: 'sans-serif', kind: 'webfont' },
  { family: 'Lato', variants: ['400', '700'], category: 'sans-serif', kind: 'webfont' },
  { family: 'Nunito', variants: ['400', '700'], category: 'sans-serif', kind: 'webfont' },
  { family: 'Quicksand', variants: ['400', '700'], category: 'sans-serif', kind: 'webfont' },
  { family: 'Source Sans Pro', variants: ['400', '700'], category: 'sans-serif', kind: 'webfont' },
  { family: 'Work Sans', variants: ['400', '700'], category: 'sans-serif', kind: 'webfont' },
  { family: 'Urbanist', variants: ['400', '700'], category: 'sans-serif', kind: 'webfont' },
  { family: 'Space Mono', variants: ['400', '700'], category: 'sans-serif', kind: 'webfont' },

  // Display
  { family: 'Bebas Neue', variants: ['400'], category: 'display', kind: 'webfont' },
  { family: 'Pacifico', variants: ['400'], category: 'display', kind: 'webfont' },
  { family: 'Great Vibes', variants: ['400'], category: 'display', kind: 'webfont' },
  { family: 'Caveat', variants: ['400', '700'], category: 'display', kind: 'webfont' },
  { family: 'Fredoka One', variants: ['400'], category: 'display', kind: 'webfont' },
  { family: 'Righteous', variants: ['400'], category: 'display', kind: 'webfont' },

  // Monospace
  { family: 'JetBrains Mono', variants: ['400', '700'], category: 'monospace', kind: 'webfont' },
  { family: 'IBM Plex Mono', variants: ['400', '700'], category: 'monospace', kind: 'webfont' },
  { family: 'Roboto Mono', variants: ['400', '700'], category: 'monospace', kind: 'webfont' },
  { family: 'Courier Prime', variants: ['400', '700'], category: 'monospace', kind: 'webfont' },
];

export function useGoogleFonts() {
  const [fonts, setFonts] = useState<GoogleFont[]>(DEFAULT_FONTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedFontFamilies, setLoadedFontFamilies] = useState<Set<string>>(new Set());

  // Fetch fuentes de Google Fonts API (opcional, usa defaults si no está configurado)
  useEffect(() => {
    const fetchFonts = async () => {
      if (!GOOGLE_FONTS_API_KEY) {
        console.info('[useGoogleFonts] Using default fonts (API key not configured)');
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `https://www.googleapis.com/webfonts/v1/webfonts?key=${GOOGLE_FONTS_API_KEY}&sort=popularity`
        );
        if (!response.ok) throw new Error('Failed to fetch fonts');

        const data = await response.json();
        setFonts(data.items || DEFAULT_FONTS);
        setError(null);
      } catch (err) {
        console.warn('[useGoogleFonts] Failed to fetch from API, using defaults', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch fonts');
        // Keep DEFAULT_FONTS
      } finally {
        setLoading(false);
      }
    };

    fetchFonts();
  }, []);

  /**
   * Cargar fuente dinámicamente en el documento
   */
  const loadFont = useCallback((fontFamily: string) => {
    if (loadedFontFamilies.has(fontFamily)) return;

    // Crear enlace a Google Fonts
    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}&display=swap`;
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    setLoadedFontFamilies((prev) => new Set([...prev, fontFamily]));
    console.info(`[useGoogleFonts] Loaded font: ${fontFamily}`);
  }, [loadedFontFamilies]);

  /**
   * Buscar fuentes por nombre
   */
  const searchFonts = useCallback((query: string): GoogleFont[] => {
    if (!query.trim()) return fonts;

    const lowerQuery = query.toLowerCase();
    return fonts.filter((font) => font.family.toLowerCase().includes(lowerQuery));
  }, [fonts]);

  /**
   * Obtener fuentes por categoría
   */
  const getFontsByCategory = useCallback((category: string): GoogleFont[] => {
    return fonts.filter((font) => font.category === category);
  }, [fonts]);

  /**
   * Obtener todas las categorías disponibles
   */
  const getCategories = useCallback((): string[] => {
    const categories = new Set(fonts.map((font) => font.category));
    return Array.from(categories).sort();
  }, [fonts]);

  return {
    fonts,
    loading,
    error,
    loadFont,
    searchFonts,
    getFontsByCategory,
    getCategories,
    loadedFontFamilies,
  };
}
