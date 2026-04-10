// Importación dinámica de Fabric.js para compatibilidad con Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let fabricModule: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getFabric(): Promise<any> {
  if (fabricModule) return fabricModule;
  try {
    const mod = await import('fabric');
    console.info('[getFabric] Fabric module imported:', Object.keys(mod));

    // Castear a any para evitar TS2339 — los tipos de Fabric 7 no declaran .fabric
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = mod as any;
    fabricModule = (m.fabric || (m.default && m.default.fabric))
      ? (m.fabric || m.default?.fabric)
      : m;

    if (fabricModule.default && (fabricModule.default.Canvas || fabricModule.default.Textbox)) {
      fabricModule = fabricModule.default;
    }

    return fabricModule;
  } catch (error) {
    console.error('[getFabric] Error importing fabric:', error);
    throw error;
  }
}

export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 600;
export const GRID_SIZE = 10;
export const SNAP_THRESHOLD = 10;

/**
 * Crear un canvas con Fabric.js.
 * Las dimensiones internas siempre son CANVAS_WIDTH × CANVAS_HEIGHT (400×600).
 * Si el contenedor visual es más estrecho, se aplica zoom proporcional para que
 * el canvas llene el espacio sin cortarse.
 */
export async function createFabricCanvas(
  canvasElement: HTMLCanvasElement,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const fabric = await getFabric();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CanvasClass = fabric.Canvas || (fabric as any).default?.Canvas;

  const canvas = new CanvasClass(canvasElement, {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    backgroundColor: '#ffffff',
    preserveObjectStacking: true,
    ...options,
  });

  canvas.clipPath = new fabric.Rect({
    left: 0,
    top: 0,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    absolutePositioned: true,
  });

  return canvas;  // <-- sin el bloque de escalado. El resize lo gestiona Canvas.tsx
}

/**
 * Agregar texto al canvas
 */
export async function addTextToCanvas(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  canvas: any,
  text: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const fabric = await getFabric();
  const TextboxClass = fabric.Textbox || fabric.IText || fabric.Text;

  if (!TextboxClass) {
    console.error('[addTextToCanvas] Textbox class not found in fabric module', fabric);
    throw new Error('Fabric Textbox class not found');
  }

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
export async function addImageToCanvas(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  canvas: any,
  imageUrl: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const fabric = await getFabric();

  console.info('[addImageToCanvas] Starting with URL:', imageUrl);
  console.info('[addImageToCanvas] Fabric Image class:', fabric.Image);

  try {
    const result = fabric.Image.fromURL(imageUrl, { crossOrigin: 'anonymous' });

    console.info('[addImageToCanvas] fromURL returned:', result);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const img: any = result instanceof Promise ? await result : result;

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
export function exportCanvasToImage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  canvas: any,
  format: 'png' | 'jpg' = 'png'
): string {
  return canvas.toDataURL({
    format,
    quality: 0.95,
    multiplier: 2,
  });
}

/**
 * Exportar canvas a JSON
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function exportCanvasToJSON(canvas: any): string {
  return JSON.stringify(canvas.toJSON());
}

/**
 * Cargar canvas desde JSON
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function disposeCanvas(canvas: any): void {
  if (!canvas) return;
  try {
    canvas.dispose();
  } catch (error) {
    console.warn('Error disposing canvas:', error);
  }
}