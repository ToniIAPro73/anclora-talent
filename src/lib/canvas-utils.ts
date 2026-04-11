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

export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 600;
export const GRID_SIZE = 10;
export const SNAP_THRESHOLD = 10;

export function getFabricImageNaturalSize(image: {
  getElement?: () => HTMLImageElement | null;
  width?: number;
  height?: number;
}): { width: number; height: number } {
  const element = typeof image.getElement === 'function' ? image.getElement() : null;

  return {
    width: element?.naturalWidth ?? image.width ?? CANVAS_WIDTH,
    height: element?.naturalHeight ?? image.height ?? CANVAS_HEIGHT,
  };
}

export async function createFabricCanvas(
  canvasElement: HTMLCanvasElement,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const fabric = await getFabric();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CanvasClass = fabric.Canvas || (fabric as any).default?.Canvas;

  // Siempre 400×600 internamente — el escalado visual lo hace CSS en Canvas.tsx
  const canvas = new CanvasClass(canvasElement, {
    backgroundColor: '#ffffff',
    preserveObjectStacking: true,
    ...options,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
  });

  canvas.clipPath = new fabric.Rect({
    left: 0,
    top: 0,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    absolutePositioned: true,
  });

  return canvas;
}

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

export async function addImageToCanvas(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  canvas: any,
  imageUrl: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any,
) {
  const fabric = await getFabric();

  console.info('[addImageToCanvas] Starting with URL:', imageUrl);
  console.info('[addImageToCanvas] Fabric Image class:', fabric.Image);

  try {
    const result = fabric.Image.fromURL(imageUrl, { crossOrigin: 'anonymous' });
    console.info('[addImageToCanvas] fromURL returned:', result);

    const img = result instanceof Promise ? await result : result;
    console.info('[addImageToCanvas] Image loaded, img:', img);

    // ── FIX: en Fabric 7 las dimensiones están en el HTMLImageElement subyacente,
    //         no en img.width / img.height (que son undefined antes de set()).
    const { width: naturalW, height: naturalH } = getFabricImageNaturalSize(img);

    console.info('[addImageToCanvas] natural dimensions:', naturalW, naturalH);

    const maxWidth  = CANVAS_WIDTH  * 0.9;
    const maxHeight = CANVAS_HEIGHT * 0.9;
    const scale = Math.min(maxWidth / naturalW, maxHeight / naturalH);

    img.set({
      left:    CANVAS_WIDTH  / 2,
      top:     CANVAS_HEIGHT / 2,
      scaleX:  scale,
      scaleY:  scale,
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

    console.info('[addImageToCanvas] Image added and rendered, scale:', scale);
    return img;
  } catch (error) {
    console.error('[addImageToCanvas] Error:', error);
    throw error;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function exportCanvasToImage(canvas: any, format: 'png' | 'jpg' = 'png'): string {
  return canvas.toDataURL({ format, quality: 0.95, multiplier: 2 });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function exportCanvasToJSON(canvas: any): string {
  return JSON.stringify(canvas.toJSON());
}

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function disposeCanvas(canvas: any): void {
  if (!canvas) return;
  try { canvas.dispose(); } catch (error) { console.warn('Error disposing canvas:', error); }
}
