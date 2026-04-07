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
  return new CanvasClass(canvasElement, {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    backgroundColor: '#ffffff',
    preserveObjectStacking: true,
    ...options,
  });
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
  const ImageClass = fabric.Image || fabric.FabricImage;
  
  try {
    // Compatibilidad Fabric 6/7 (Promise-based)
    if (ImageClass.fromURL && typeof ImageClass.fromURL(imageUrl) === 'object' && (ImageClass.fromURL(imageUrl) as any).then) {
      const img = await ImageClass.fromURL(imageUrl, { crossOrigin: 'anonymous' });
      setupImage(img);
      return img;
    } 
    // Compatibilidad Fabric 5 (Callback-based)
    else {
      return new Promise((resolve, reject) => {
        ImageClass.fromURL(imageUrl, (img: any) => {
          if (!img) return reject(new Error('Failed to load image'));
          setupImage(img);
          resolve(img);
        }, { crossOrigin: 'anonymous' });
      });
    }
  } catch (error) {
    console.error('Error in addImageToCanvas:', error);
    throw error;
  }

  function setupImage(img: any) {
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
