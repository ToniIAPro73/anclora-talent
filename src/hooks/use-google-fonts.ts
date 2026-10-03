/**
 * Hook para gestionar y cargar fuentes de Google Fonts
 * Proporciona búsqueda, categorización y carga dinámica de fuentes
 */

import { useState, useEffect, useCallback } from 'react';
import { isLocallySubstitutedFont } from '@/lib/style-engine/font-stack';
import { getSelectableFontCatalog, type FontCatalogEntry } from '@/lib/style-engine/font-registry';
import type { ProjectFontAsset } from '@/lib/style-engine/project-font-assets';

export type GoogleFont = FontCatalogEntry;

const GOOGLE_FONTS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_FONTS_API_KEY || '';
const GOOGLE_FONTS_API_KEY_PATTERN = /^AIza[0-9A-Za-z\-_]{20,}$/;

const DEFAULT_FONTS: GoogleFont[] = getSelectableFontCatalog();

export function useGoogleFonts(projectFontAssets: ProjectFontAsset[] = []) {
  const [fonts, setFonts] = useState<GoogleFont[]>(DEFAULT_FONTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedFontFamilies, setLoadedFontFamilies] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof FontFace === 'undefined') return;
    let cancelled = false;
    const loadEmbedded = async () => {
      for (const asset of projectFontAssets.filter((item) => item.usable && item.dataBase64)) {
        const source = `url(data:font/${asset.format};base64,${asset.dataBase64})`;
        const face = new FontFace(asset.sourceFamily, source, {
          weight: asset.variant === 'bold' || asset.variant === 'bold-italic' ? '700' : '400',
          style: asset.variant === 'italic' || asset.variant === 'bold-italic' ? 'italic' : 'normal',
        });
        try {
          await face.load();
          if (!cancelled) {
            document.fonts.add(face);
            setLoadedFontFamilies((prev) => new Set([...prev, asset.sourceFamily]));
          }
        } catch (error) {
          console.warn('[useGoogleFonts] Embedded project font failed to load', { family: asset.sourceFamily, error });
        }
      }
    };
    void loadEmbedded();
    return () => { cancelled = true; };
  }, [projectFontAssets]);

  // Fetch fuentes de Google Fonts API (opcional, usa defaults si no está configurado)
  useEffect(() => {
    const fetchFonts = async () => {
      if (!GOOGLE_FONTS_API_KEY_PATTERN.test(GOOGLE_FONTS_API_KEY)) {
        console.info('[useGoogleFonts] Using default fonts (API key missing or invalid)');
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `https://www.googleapis.com/webfonts/v1/webfonts?key=${GOOGLE_FONTS_API_KEY}&sort=popularity`
        );
        if (!response.ok) throw new Error('Failed to fetch fonts');

        const data = await response.json();
        setFonts(
          Array.isArray(data.items)
            ? data.items.map((font: Partial<GoogleFont>) => ({
                family: font.family ?? '',
                variants: font.variants ?? ['400'],
                category: (font.category as GoogleFont['category']) ?? 'sans-serif',
                kind: 'webfont' as const,
                loadingStrategy: 'google-webfont' as const,
                selectable: true,
              })).filter((font: GoogleFont) => font.family)
            : DEFAULT_FONTS,
        );
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

    // Fuentes extraídas de un documento fuente (p. ej. la familia Liberation
    // de LibreOffice) no existen en el catálogo de Google Fonts: pedirlas
    // solo produce una petición fallida y una sustitución silenciosa del
    // navegador. Se resuelven localmente vía buildFontFamilyStack.
    if (isLocallySubstitutedFont(fontFamily)) {
      setLoadedFontFamilies((prev) => new Set([...prev, fontFamily]));
      return;
    }

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
