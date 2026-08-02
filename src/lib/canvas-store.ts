import { create } from 'zustand';
import { wrapTextToWidth } from './canvas-utils';

/**
 * Subconjunto estructural de los objetos Fabric (y wrappers propios con
 * props extra como rawText/wrapWidth/removeFromCanvas) que guarda el store.
 */
export interface CanvasFabricObject {
  id?: string;
  type?: string;
  text?: string;
  rawText?: string;
  wrapWidth?: number;
  left?: number;
  top?: number;
  originX?: string;
  originY?: string;
  fill?: string;
  opacity?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: string;
  textAlign?: string;
  lineHeight?: number;
  charSpacing?: number;
  width?: number;
  set?(props: Record<string, unknown> | string, value?: unknown): void;
  initDimensions?(): void;
  setCoords?(): void;
  removeFromCanvas?(): void;
  toObject?(props?: string[]): Record<string, unknown>;
}

/** Subconjunto estructural del canvas Fabric que usa el store. */
export interface CanvasLike {
  remove(obj: CanvasFabricObject): void;
  renderAll(): void;
  requestRenderAll(): void;
  getObjects(): CanvasFabricObject[];
  toJSON(props?: string[]): unknown;
  toDataURL(options?: Record<string, unknown>): string;
  loadFromJSON(json: unknown): Promise<unknown>;
}

export interface CanvasElement {
  id: string;
  type: 'text' | 'image';
  object: CanvasFabricObject;
  properties: {
    fill?: string;
    fontSize?: number;
    fontFamily?: string;
    opacity?: number;
    angle?: number;
    textAlign?: string;
    lineHeight?: number;
    charSpacing?: number;
    fontWeight?: string | number;
    fontStyle?: string;
    text?: string;
  };
}

interface CanvasStore {
  canvas: CanvasLike | null;
  selectedElement: CanvasElement | null;
  elements: CanvasElement[];
  history: string[];
  historyStep: number;
  
  // Canvas actions
  setCanvas: (canvas: CanvasLike) => void;
  selectElement: (element: CanvasElement | null) => void;
  addElement: (element: CanvasElement) => void;
  removeElement: (id: string) => void;
  updateElement: (id: string, properties: Partial<CanvasElement['properties']>) => void;
  
  // History actions
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  
  // Clear
  clear: () => void;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  canvas: null,
  selectedElement: null,
  elements: [],
  history: [],
  historyStep: -1,

  setCanvas: (canvas: CanvasLike) => set({ canvas }),

  selectElement: (element: CanvasElement | null) => set({ selectedElement: element }),

  addElement: (element: CanvasElement) => {
    set((state: CanvasStore) => ({
      elements: [...state.elements, element],
      selectedElement: element, // Seleccionar automáticamente al añadir
    }));
    get().pushHistory();
  },

  removeElement: (id: string) => {
    const state = get();
    const element = state.elements.find((el: CanvasElement) => el.id === id);
    if (element && state.canvas) {
      if (typeof element.object?.removeFromCanvas === 'function') {
        element.object.removeFromCanvas();
      } else {
        state.canvas.remove(element.object);
        state.canvas.renderAll();
      }
      set((state: CanvasStore) => ({
        elements: state.elements.filter((el: CanvasElement) => el.id !== id),
        selectedElement: state.selectedElement?.id === id ? null : state.selectedElement,
      }));
      get().pushHistory();
    }
  },

  updateElement: (id: string, properties: Partial<CanvasElement['properties']>) => {
    const state = get();
    const element = state.elements.find((el: CanvasElement) => el.id === id);
    if (element && element.object) {
      const updated = {
        ...element,
        properties: { ...element.properties, ...properties },
      };

      const wrapWidth = typeof element.object.wrapWidth === 'number' ? element.object.wrapWidth : null;
      const rawText =
        typeof properties.text === 'string'
          ? properties.text
          : typeof element.object.rawText === 'string'
            ? element.object.rawText
            : element.object.text;

      const nextFontSize = typeof properties.fontSize === 'number' ? properties.fontSize : element.object.fontSize;
      const nextFontFamily = typeof properties.fontFamily === 'string' ? properties.fontFamily : element.object.fontFamily;
      const nextFontWeight =
        typeof properties.fontWeight !== 'undefined' ? properties.fontWeight : element.object.fontWeight;

      const nextProperties = { ...properties } as Record<string, unknown>;
      if (wrapWidth && typeof rawText === 'string') {
        nextProperties.text = wrapTextToWidth({
          text: rawText,
          maxWidth: wrapWidth,
          fontSize: typeof nextFontSize === 'number' ? nextFontSize : 24,
          fontFamily: typeof nextFontFamily === 'string' ? nextFontFamily : undefined,
          fontWeight: typeof nextFontWeight === 'string' || typeof nextFontWeight === 'number' ? nextFontWeight : undefined,
        });
        nextProperties.rawText = rawText;
      }

      // Apply properties to fabric object directly
      element.object.set?.(nextProperties);
      element.object.set?.('dirty', true);
      
      // Special handling for text related properties that might need re-render or re-calc
      if (properties.fontSize || properties.fontFamily || properties.fontWeight || properties.text || properties.textAlign) {
        if (typeof element.object.width === 'number') {
          element.object.set?.({
            minWidth: element.object.width,
            scaleX: 1,
            scaleY: 1,
          });
        }
        element.object.initDimensions?.();
        element.object.setCoords?.();
      }
      
      state.canvas?.requestRenderAll();
      
      set((state: CanvasStore) => ({
        elements: state.elements.map((el: CanvasElement) => (el.id === id ? updated : el)),
        selectedElement: state.selectedElement?.id === id ? updated : state.selectedElement,
      }));
    }
  },

  pushHistory: () => {
    const state = get();
    if (state.canvas) {
      const newHistory = state.history.slice(0, state.historyStep + 1);
      // Incluir 'id' en la serialización para que se mantenga en el historial
      newHistory.push(JSON.stringify(state.canvas.toJSON(['id'])));
      set({
        history: newHistory,
        historyStep: newHistory.length - 1,
      });
    }
  },

  undo: async () => {
    const state = get();
    if (state.historyStep > 0 && state.canvas) {
      const newStep = state.historyStep - 1;
      const json = JSON.parse(state.history[newStep]);
      
      try {
        // En Fabric 7, loadFromJSON devuelve una Promesa
        await state.canvas.loadFromJSON(json);
        
        // Sincronizar los elementos del store con los nuevos objetos del canvas
        const canvasObjects = state.canvas.getObjects();
        const newElements: CanvasElement[] = canvasObjects.map((obj) => ({
          id: obj.id || `element-${Math.random().toString(36).substr(2, 9)}`,
          type: (obj.type?.includes('text') ? 'text' : 'image') as CanvasElement['type'],
          object: obj,
          properties: { ...(obj.toObject?.(['id']) || {}) as CanvasElement['properties'] }
        }));
        
        state.canvas.renderAll();
        set({ 
          historyStep: newStep,
          elements: newElements,
          selectedElement: null // Limpiar selección al deshacer para evitar referencias muertas
        });
      } catch (error) {
        console.error('[CanvasStore] Error during undo:', error);
      }
    }
  },

  redo: async () => {
    const state = get();
    if (state.historyStep < state.history.length - 1 && state.canvas) {
      const newStep = state.historyStep + 1;
      const json = JSON.parse(state.history[newStep]);
      
      try {
        await state.canvas.loadFromJSON(json);
        
        const canvasObjects = state.canvas.getObjects();
        const newElements: CanvasElement[] = canvasObjects.map((obj) => ({
          id: obj.id || `element-${Math.random().toString(36).substr(2, 9)}`,
          type: (obj.type?.includes('text') ? 'text' : 'image') as CanvasElement['type'],
          object: obj,
          properties: { ...(obj.toObject?.(['id']) || {}) as CanvasElement['properties'] }
        }));
        
        state.canvas.renderAll();
        set({ 
          historyStep: newStep,
          elements: newElements,
          selectedElement: null
        });
      } catch (error) {
        console.error('[CanvasStore] Error during redo:', error);
      }
    }
  },

  clear: () => {
    set({
      selectedElement: null,
      elements: [],
      history: [],
      historyStep: -1,
    });
  },
}));
