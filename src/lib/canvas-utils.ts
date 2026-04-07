// Importación dinámica de Fabric.js para compatibilidad con Next.js
let fabricModule: any = null;

// Función para obtener la instancia de Fabric.js
export async function getFabric() {
  if (fabricModule) return fabricModule;
  const mod = await import('fabric');
  // En Fabric 6/7 ESM, el objeto fabric está en mod
  // En versiones anteriores o CJS, podría estar en mod.default
  fabricModule = (mod as any).fabric || mod;
  return fabricModule;
}

export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 600;
export const GRID_SIZE = 10;
export const SNAP_THRESHOLD = 10;

/**
 * Crear un canvas con Fabric.js
 */
export async function createFabricCanvas(
  canvasElement: HTMLCanvasElement,
  options?: any
) {
  const fabric = await getFabric();
  // Intentar usar fabric.Canvas o fabric.Canvas (clase)
  const CanvasClass = fabric.Canvas || (fabric as any).default?.Canvas;
  const canvas = new CanvasClass(canvasElement, {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    backgroundColor: '#ffffff',
    preserveObjectStacking: true,
    ...options,
  });

  // Enable object clipping to canvas boundaries
  canvas.clipPath = new fabric.Rect({
    left: 0,
    top: 0,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    absolutePositioned: true,
  });

  return canvas;
}

/**
 * Agregar texto al canvas
 */
export async function addTextToCanvas(canvas: any, text: string, options?: any) {
  const fabric = await getFabric();
  const TextboxClass = fabric.Textbox || fabric.IText;
  
  const fabricText = new TextboxClass(text, {
    left: canvas.width / 2,
    top: canvas.height / 2,
    width: canvas.width * 0.8,
    fontSize: 24,
    fontFamily: 'Arial',
    fill: '#000000',
    originX: 'center',
    originY: 'center',
    textAlign: 'center',
    ...options,
  });
  
  if (options?.id) (fabricText as any).id = options.id;

  canvas.add(fabricText);
  canvas.setActiveObject(fabricText);
  if (canvas.requestRenderAll) canvas.requestRenderAll();
  else canvas.renderAll();

  return fabricText;
}

/**
 * Agregar imagen al canvas
 */
export async function addImageToCanvas(canvas: any, imageUrl: string, options?: any) {
  const fabric = await getFabric();

  console.info('[addImageToCanvas] Starting with URL:', imageUrl);
  console.info('[addImageToCanvas] Fabric Image class:', fabric.Image);

  try {
    // Fabric.js 7+ uses Promise-based API
    const result = fabric.Image.fromURL(
      imageUrl,
      { crossOrigin: 'anonymous' }
    );

    console.info('[addImageToCanvas] fromURL returned:', result);

    // Handle both Promise and callback-based returns
    const img = result instanceof Promise ? await result : result;

    console.info('[addImageToCanvas] Image loaded, img:', img);

    const maxWidth = canvas.width * 0.8;
    const maxHeight = canvas.height * 0.8;
    const scale = Math.min(maxWidth / img.width, maxHeight / img.height);

    img.set({
      left: canvas.width / 2,
      top: canvas.height / 2,
      scaleX: scale,
      scaleY: scale,
      originX: 'center',
      originY: 'center',
      ...options,
    });

    if (options?.id) (img as any).id = options.id;

    canvas.add(img);
    canvas.setActiveObject(img);
    if (canvas.requestRenderAll) canvas.requestRenderAll();
    else canvas.renderAll();
    console.info('[addImageToCanvas] Image added and rendered');
    return img;
  } catch (error) {
    console.error('[addImageToCanvas] Error:', error);
    throw error;
  }
}

/**
 * Exportar canvas a imagen
 */
export function exportCanvasToImage(canvas: any, format: 'png' | 'jpg' = 'png'): string {
  return canvas.toDataURL({
    format,
    quality: 0.95,
    multiplier: 2,
  });
}

/**
 * Exportar canvas a JSON
 */
export function exportCanvasToJSON(canvas: any): string {
  return JSON.stringify(canvas.toJSON());
}

/**
 * Cargar canvas desde JSON
 */
export function loadCanvasFromJSON(canvas: any, json: string): Promise<void> {
  return new Promise((resolve) => {
    canvas.loadFromJSON(json, () => {
      if (canvas.requestRenderAll) canvas.requestRenderAll();
      else canvas.renderAll();
      resolve();
    });
  });
}

/**
 * Limpiar y descartar el canvas
 */
export function disposeCanvas(canvas: any): void {
  if (!canvas) return;
  try {
    canvas.dispose();
  } catch (error) {
    console.warn('Error disposing canvas:', error);
  }
}
