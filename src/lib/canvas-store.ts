import { create } from 'zustand';
import { getFabric } from './canvas-utils';

export interface CanvasElement {
  id: string;
  type: 'text' | 'image';
  object: any;
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
  canvas: any | null;
  selectedElement: CanvasElement | null;
  elements: CanvasElement[];
  history: string[];
  historyStep: number;
  
  // Canvas actions
  setCanvas: (canvas: any) => void;
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

export const useCanvasStore = create<CanvasStore>((set: any, get: any) => ({
  canvas: null,
  selectedElement: null,
  elements: [],
  history: [],
  historyStep: -1,

  setCanvas: (canvas: any) => set({ canvas }),

  selectElement: (element: CanvasElement | null) => set({ selectedElement: element }),

  addElement: (element: CanvasElement) => {
    set((state: CanvasStore) => ({
      elements: [...state.elements, element],
    }));
    get().pushHistory();
  },

  removeElement: (id: string) => {
    const state = get();
    const element = state.elements.find((el: CanvasElement) => el.id === id);
    if (element && state.canvas) {
      state.canvas.remove(element.object);
      state.canvas.renderAll();
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
      
      // Apply properties to fabric object directly
      element.object.set(properties);
      element.object.set('dirty', true);
      
      // Special handling for text related properties that might need re-render or re-calc
      if (properties.fontSize || properties.fontFamily || properties.fontWeight || properties.text || properties.textAlign) {
        element.object.setCoords();
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

  undo: () => {
    const state = get();
    if (state.historyStep > 0 && state.canvas) {
      const newStep = state.historyStep - 1;
      state.canvas.loadFromJSON(
        JSON.parse(state.history[newStep]),
        () => {
          state.canvas?.renderAll();
          set({ historyStep: newStep });
        }
      );
    }
  },

  redo: () => {
    const state = get();
    if (state.historyStep < state.history.length - 1 && state.canvas) {
      const newStep = state.historyStep + 1;
      state.canvas.loadFromJSON(
        JSON.parse(state.history[newStep]),
        () => {
          state.canvas?.renderAll();
          set({ historyStep: newStep });
        }
      );
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
