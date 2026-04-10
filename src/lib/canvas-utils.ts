// Importación dinámica de Fabric.js para compatibilidad con Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let fabricModule: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getFabric(): Promise<any> {
  if (fabricModule) return fabricModule;
  try {
    const mod = await import('fabric');
    console.info('[getFabric] Fabric module imported:', Object.keys(mod));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = mod as any;
    fabricModule =
      m.fabric || (m.default && m.default.fabric)
        ? m.fabric || m.default?.fabric
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

// Dimensiones internas del canvas (espacio de coordenadas de Fabric)
export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 600;
export const GRID_SIZE = 10;
export const SNAP_THRESHOLD = 10;

/**
 * Crear un canvas con Fabric.js.
 *
 * Si se pasan `options.width` y `options.height` se usan como dimensiones
 * visuales del canvas (tamaño del contenedor real en pantalla). El zoom de
 * Fabric se ajusta automáticamente para que el espacio de coordenadas interno
 * siga siendo CANVAS_WIDTH × CANVAS_HEIGHT (400 × 600).
 *
 * Si NO se pasan, el canvas se crea en tamaño 1:1 (400 × 600 px).
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

  // Dimensiones visuales: si el caller las pasa, las respetamos; si no, usamos los defaults.
  const visualWidth  = options?.width  ?? CANVAS_WIDTH;
  const visualHeight = options?.height ?? CANVAS_HEIGHT;

  // Zoom para mapear el espacio interno (400×600) al espacio visual real
  const zoom = visualWidth / CANVAS_WIDTH;

  // Crear canvas con las dimensiones visuales reales
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { width: _w, height: _h, ...restOptions } = (options ?? {}) as any;
  const canvas = new CanvasClass(canvasElement, {
    backgroundColor: '#ffffff',
    preserveObjectStacking: true,
    ...restOptions,
    width: visualWidth,
    height: visualHeight,
  });

  // Aplicar zoom para que los objetos sigan usando coordenadas 400×600
  if (zoom !== 1) {
    canvas.setZoom(zoom);
  }

  // clipPath en coordenadas INTERNAS (antes del zoom) para que Fabric lo escale bien
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
 * Agregar texto al canvas.
 * Las coordenadas se expresan en el espacio interno (400×600); el zoom se encarga del escalado.
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

  // Posicionar en el centro del espacio interno (400×600), no del visual
  const fabricText = new TextboxClass(text, {
    left: CANVAS_WIDTH / 2,
    top: CANVAS_HEIGHT / 2,
    width: CANVAS_WIDTH * 0.8,
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
 * Agregar imagen al canvas.
 * El escalado se calcula respecto al espacio interno (400×600).
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

    // Escalar respecto al espacio interno (400×600), no al visual
    const maxWidth  = CANVAS_WIDTH  * 0.8;
    const maxHeight = CANVAS_HEIGHT * 0.8;
    const scale = Math.min(maxWidth / img.width, maxHeight / img.height);

    img.set({
      left: CANVAS_WIDTH / 2,
      top: CANVAS_HEIGHT / 2,
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
 * Exportar canvas a imagen.
 * multiplier: 2 para exportar a 800×1200 px (calidad retina).
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