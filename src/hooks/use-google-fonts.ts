/**
 * Carga bajo demanda de las familias del catálogo canónico de fuentes.
 */

import { useState, useEffect, useCallback } from 'react';
import { findCatalogEntry, getSelectableFontCatalog, type FontCatalogEntry } from '@/lib/style-engine/font-registry';
import type { ProjectFontAsset } from '@/lib/style-engine/project-font-assets';

export type GoogleFont = FontCatalogEntry;

export type FontLoadStatus = 'loading' | 'loaded' | 'failed' | 'system-available' | 'system-missing';

const CONTROLLED_FONTS: GoogleFont[] = getSelectableFontCatalog();

const statusByFamily = new Map<string, FontLoadStatus>();
const loadPromises = new Map<string, Promise<FontLoadStatus>>();

function googleStylesheetUrl(entry: FontCatalogEntry): string {
  const family = entry.family.replace(/ /g, '+');
  const weights = entry.variants.join(';');
  return `https://fonts.googleapis.com/css2?family=${family}:wght@${weights}&display=swap`;
}

async function loadBundledFamily(entry: FontCatalogEntry): Promise<FontLoadStatus> {
  if (typeof FontFace === 'undefined') return 'failed';
  const faces = (entry.bundledFiles ?? []).map((file) => new FontFace(entry.family, `url(${file.url}) format('woff2')`, {
    weight: file.weight,
    style: file.style,
  }));
  try {
    const loaded = await Promise.all(faces.map((face) => face.load()));
    loaded.forEach((face) => document.fonts.add(face));
    return 'loaded';
  } catch (error) {
    console.warn('[useGoogleFonts] Bundled font failed to load', { family: entry.family, error });
    return 'failed';
  }
}

function loadGoogleFamily(entry: FontCatalogEntry): Promise<FontLoadStatus> {
  return new Promise<FontLoadStatus>((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = googleStylesheetUrl(entry);
    link.onerror = () => resolve('failed');
    link.onload = () => {
      document.fonts.load(`400 16px "${entry.family}"`).then(
        (faces) => resolve(faces.length > 0 ? 'loaded' : 'failed'),
        () => resolve('failed'),
      );
    };
    document.head.appendChild(link);
  });
}

function checkSystemFamily(entry: FontCatalogEntry): FontLoadStatus {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return 'system-missing';
  const sample = 'Mmwwii0123456789 Aa Qq Gg';
  context.font = '72px monospace';
  const fallbackWidth = context.measureText(sample).width;
  context.font = `72px "${entry.family}", monospace`;
  const withFamilyWidth = context.measureText(sample).width;
  return withFamilyWidth !== fallbackWidth ? 'system-available' : 'system-missing';
}

function loadCatalogFont(entry: FontCatalogEntry): Promise<FontLoadStatus> {
  const cached = loadPromises.get(entry.family);
  if (cached) return cached;
  const promise: Promise<FontLoadStatus> = (async () => {
    statusByFamily.set(entry.family, 'loading');
    let status: FontLoadStatus;
    if (entry.loadingStrategy === 'bundled') status = await loadBundledFamily(entry);
    else if (entry.loadingStrategy === 'google-webfont') status = await loadGoogleFamily(entry);
    else status = checkSystemFamily(entry);
    statusByFamily.set(entry.family, status);
    return status;
  })();
  loadPromises.set(entry.family, promise);
  return promise;
}

export function useGoogleFonts(projectFontAssets: ProjectFontAsset[] = []) {
  const [fonts] = useState<GoogleFont[]>(CONTROLLED_FONTS);
  const [fontStatuses, setFontStatuses] = useState<Record<string, FontLoadStatus>>({});

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
          if (!cancelled) document.fonts.add(face);
        } catch (error) {
          console.warn('[useGoogleFonts] Embedded project font failed to load', { family: asset.sourceFamily, error });
        }
      }
    };
    void loadEmbedded();
    return () => { cancelled = true; };
  }, [projectFontAssets]);

  const loadFont = useCallback((fontFamily: string) => {
    const entry = findCatalogEntry(fontFamily);
    if (!entry) return Promise.resolve(undefined);
    return loadCatalogFont(entry).then((status) => {
      setFontStatuses((prev) => (prev[entry.family] === status ? prev : { ...prev, [entry.family]: status }));
      return status;
    });
  }, []);

  const searchFonts = useCallback((query: string): GoogleFont[] => {
    if (!query.trim()) return fonts;

    const lowerQuery = query.toLowerCase();
    return fonts.filter((font) => font.family.toLowerCase().includes(lowerQuery));
  }, [fonts]);

  const getFontsByCategory = useCallback((category: string): GoogleFont[] => {
    return fonts.filter((font) => font.category === category);
  }, [fonts]);

  const getCategories = useCallback((): string[] => {
    const categories = new Set(fonts.map((font) => font.category));
    return Array.from(categories).sort();
  }, [fonts]);

  return {
    fonts,
    fontStatuses,
    loadFont,
    searchFonts,
    getFontsByCategory,
    getCategories,
  };
}
