/**
 * Cover Studio v2 — real back-cover compositions (400x600 surface px).
 *
 * A back cover is not a front cover turned around: it is read, not seen. The body copy carries the weight, the title
 * is a reference, the author closes the page, and the bottom-right corner is kept clear for a future ISBN block. Each
 * layout therefore defines its own slots (title / body / author / authorBio) and restrained decoration, and every text
 * slot stays inside the safe area (28px from the surface edge, > bleed 3mm + 5mm margin = ~21px).
 *
 * Layouts carry GEOMETRY and decoration only. Typography lives in the template (`layerStyles`) and the text of every
 * slot comes from the project, never from here.
 */

export type BackSlotKey = 'title' | 'body' | 'author' | 'authorBio';

export interface BackSlot {
  x: number;
  y: number;
  width: number;
  textAlign: 'left' | 'center' | 'right';
}

export interface BackDecor {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** accent = title colour, rule = muted text colour, panel = a quiet tint of the title colour. */
  tone: 'accent' | 'rule' | 'panel';
  /** Layer opacity: panels are tints, rules/accents are solid. */
  opacity?: number;
}

export interface BackLayout {
  slots: Partial<Record<BackSlotKey, BackSlot>>;
  decor: BackDecor[];
}

export const BACK_LAYOUTS: Record<string, BackLayout> = {
  'classic-editorial': {
    slots: {
      title: { x: 32, y: 48, width: 336, textAlign: 'center' },
      body: { x: 40, y: 124, width: 320, textAlign: 'left' },
      author: { x: 40, y: 484, width: 200, textAlign: 'left' },
      authorBio: { x: 40, y: 506, width: 210, textAlign: 'left' },
    },
    decor: [
      { name: 'Filete', x: 180, y: 98, width: 40, height: 2, tone: 'accent' },
      { name: 'Filete', x: 40, y: 468, width: 120, height: 1, tone: 'rule' },
    ],
  },
  'author-focus': {
    slots: {
      title: { x: 32, y: 44, width: 336, textAlign: 'left' },
      body: { x: 32, y: 88, width: 336, textAlign: 'left' },
      author: { x: 32, y: 362, width: 336, textAlign: 'left' },
      authorBio: { x: 32, y: 402, width: 250, textAlign: 'left' },
    },
    decor: [
      { name: 'Banda del autor', x: 0, y: 316, width: 400, height: 284, tone: 'panel', opacity: 0.12 },
      { name: 'Filete', x: 32, y: 342, width: 36, height: 3, tone: 'accent' },
    ],
  },
  'essay-premium': {
    slots: {
      title: { x: 52, y: 48, width: 300, textAlign: 'left' },
      body: { x: 52, y: 112, width: 300, textAlign: 'left' },
      author: { x: 52, y: 482, width: 250, textAlign: 'left' },
      authorBio: { x: 52, y: 504, width: 196, textAlign: 'left' },
    },
    decor: [{ name: 'Filete vertical', x: 34, y: 112, width: 2, height: 330, tone: 'accent' }],
  },
  'business-band': {
    slots: {
      title: { x: 32, y: 44, width: 336, textAlign: 'left' },
      body: { x: 32, y: 136, width: 336, textAlign: 'left' },
      author: { x: 32, y: 488, width: 200, textAlign: 'left' },
      authorBio: { x: 32, y: 512, width: 210, textAlign: 'left' },
    },
    decor: [
      { name: 'Filete', x: 32, y: 112, width: 56, height: 4, tone: 'accent' },
      { name: 'Banda inferior', x: 0, y: 468, width: 400, height: 132, tone: 'panel', opacity: 0.16 },
    ],
  },
  'literary-quote': {
    slots: {
      title: { x: 40, y: 62, width: 320, textAlign: 'center' },
      body: { x: 52, y: 136, width: 296, textAlign: 'center' },
      author: { x: 40, y: 474, width: 320, textAlign: 'center' },
      authorBio: { x: 70, y: 502, width: 260, textAlign: 'center' },
    },
    decor: [
      { name: 'Filete', x: 170, y: 40, width: 60, height: 1, tone: 'rule' },
      { name: 'Ornamento', x: 188, y: 454, width: 24, height: 2, tone: 'accent' },
    ],
  },
  'minimal-air': {
    slots: {
      title: { x: 48, y: 120, width: 304, textAlign: 'center' },
      body: { x: 48, y: 200, width: 304, textAlign: 'center' },
      author: { x: 48, y: 506, width: 304, textAlign: 'center' },
      authorBio: { x: 70, y: 528, width: 260, textAlign: 'center' },
    },
    decor: [],
  },
  'guide-structured': {
    slots: {
      title: { x: 48, y: 44, width: 320, textAlign: 'left' },
      body: { x: 40, y: 146, width: 320, textAlign: 'left' },
      author: { x: 32, y: 474, width: 210, textAlign: 'left' },
      authorBio: { x: 32, y: 496, width: 210, textAlign: 'left' },
    },
    decor: [
      { name: 'Marca de título', x: 32, y: 48, width: 4, height: 54, tone: 'accent' },
      { name: 'Panel de contenido', x: 24, y: 128, width: 352, height: 304, tone: 'panel', opacity: 0.1 },
    ],
  },
};

/** The bottom-right corner is reserved for a future ISBN block: the left-aligned layouts keep every slot out of it (centred layouts are symmetric by design). */
export const BACK_ISBN_RESERVED = { x: 252, y: 500, width: 120, height: 68 } as const;
