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

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  canvas: null,
  selectedElement: null,
  elements: [],
  history: [],
  historyStep: -1,

  setCanvas: (canvas) => set({ canvas }),

  selectElement: (element) => set({ selectedElement: element }),

  addElement: (element) => {
    set((state) => ({
      elements: [...state.elements, element],
    }));
    get().pushHistory();
  },

  removeElement: (id) => {
    const state = get();
    const element = state.elements.find((el) => el.id === id);
    if (element && state.canvas) {
      state.canvas.remove(element.object);
      state.canvas.renderAll();
      set((state) => ({
        elements: state.elements.filter((el) => el.id !== id),
        selectedElement: state.selectedElement?.id === id ? null : state.selectedElement,
      }));
      get().pushHistory();
    }
  },

  updateElement: (id, properties) => {
    const state = get();
    const element = state.elements.find((el) => el.id === id);
    if (element) {
      const updated = {
        ...element,
        properties: { ...element.properties, ...properties },
      };
      
      // Apply properties to fabric object
      if (properties.fill) element.object.set({ fill: properties.fill });
      if (properties.fontSize) element.object.set({ fontSize: properties.fontSize });
      if (properties.fontFamily) element.object.set({ fontFamily: properties.fontFamily });
      if (properties.opacity !== undefined) element.object.set({ opacity: properties.opacity });
      if (properties.angle) element.object.set({ angle: properties.angle });
      
      state.canvas?.renderAll();
      
      set((state) => ({
        elements: state.elements.map((el) => (el.id === id ? updated : el)),
      }));
      get().pushHistory();
    }
  },

  pushHistory: () => {
    const state = get();
    if (state.canvas) {
      const newHistory = state.history.slice(0, state.historyStep + 1);
      newHistory.push(JSON.stringify(state.canvas.toJSON()));
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
      canvas: null,
      selectedElement: null,
      elements: [],
      history: [],
      historyStep: -1,
    });
  },
}));
