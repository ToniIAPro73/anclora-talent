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

type FabricImageLike = {
  getElement?: () => HTMLImageElement | null;
  width?: number;
  height?: number;
  set?: (props: Record<string, unknown>) => void;
  setCoords?: () => void;
};

type FabricTextLike = {
  id?: string;
  set?: (props: Record<string, unknown> | string, value?: unknown) => void;
  setCoords?: () => void;
  initDimensions?: () => void;
};

type AddImageOptions = {
  id?: string;
  attachToCanvas?: boolean;
  left?: number;
  top?: number;
  originX?: string;
  originY?: string;
  selectable?: boolean;
  evented?: boolean;
  opacity?: number;
  scaleX?: number;
  scaleY?: number;
  fit?: 'contain' | 'cover';
  targetWidth?: number;
  targetHeight?: number;
  [key: string]: unknown;
};

export function getFabricImageSourceSize(image: FabricImageLike): { width: number; height: number } {
  const element = typeof image.getElement === 'function' ? image.getElement() : null;

  return {
    width: element?.naturalWidth ?? image.width ?? CANVAS_WIDTH,
    height: element?.naturalHeight ?? image.height ?? CANVAS_HEIGHT,
  };
}

export function getImageScaleForFit({
  imageWidth,
  imageHeight,
  targetWidth,
  targetHeight,
  fit = 'contain',
}: {
  imageWidth: number;
  imageHeight: number;
  targetWidth: number;
  targetHeight: number;
  fit?: 'contain' | 'cover';
}): number {
  const widthRatio = targetWidth / imageWidth;
  const heightRatio = targetHeight / imageHeight;
  return fit === 'cover' ? Math.max(widthRatio, heightRatio) : Math.min(widthRatio, heightRatio);
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
    minWidth: options?.width ?? CANVAS_WIDTH * 0.8,
    fontSize: 24,
    fontFamily: 'Arial',
    fill: '#000000',
    originX: 'center',
    originY: 'center',
    textAlign: 'center',
    scaleX: 1,
    scaleY: 1,
    objectCaching: false,
    noScaleCache: true,
    splitByGrapheme: false,
    ...options,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (options?.id) (fabricText as any).id = options.id;

  // Fabric 7 can keep stale text dimensions/caches if the textbox is created
  // before the final font metrics settle. Force a fresh measurement up front.
  if (typeof options?.width === 'number') {
    (fabricText as FabricTextLike).set?.({
      width: options.width,
      minWidth: options.width,
      scaleX: 1,
      scaleY: 1,
    });
  }
  (fabricText as FabricTextLike).initDimensions?.();
  if (typeof options?.width === 'number') {
    (fabricText as FabricTextLike).set?.({
      width: options.width,
      minWidth: options.width,
    });
  }
  (fabricText as FabricTextLike).set?.('dirty', true);
  (fabricText as FabricTextLike).setCoords?.();

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
  options: AddImageOptions = {},
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
    const { width: sourceW, height: sourceH } = getFabricImageSourceSize(img);

    console.info('[addImageToCanvas] source dimensions:', sourceW, sourceH);
    console.info('[addImageToCanvas] fabric dimensions before normalization:', img.width, img.height);

    img.set?.({
      width: sourceW,
      height: sourceH,
    });

  const fit = options.fit ?? 'contain';
  const attachToCanvas = options.attachToCanvas ?? true;
  const targetWidth = options.targetWidth ?? CANVAS_WIDTH * 0.9;
    const targetHeight = options.targetHeight ?? CANVAS_HEIGHT * 0.9;
    const scale = getImageScaleForFit({
      imageWidth: sourceW,
      imageHeight: sourceH,
      targetWidth,
      targetHeight,
      fit,
    });

    img.set({
      left: options.left ?? CANVAS_WIDTH / 2,
      top: options.top ?? CANVAS_HEIGHT / 2,
      scaleX: options.scaleX ?? scale,
      scaleY: options.scaleY ?? scale,
      originX: 'center',
      originY: 'center',
      ...options,
    });
    if (typeof img.setCoords === 'function') {
      img.setCoords();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (options?.id) (img as any).id = options.id;

    if (attachToCanvas) {
      canvas.add(img);
      if (typeof img.setCoords === 'function') {
        img.setCoords();
      }
      canvas.setActiveObject(img);
      if (canvas.requestRenderAll) canvas.requestRenderAll();
      else canvas.renderAll();
    }

    console.info('[addImageToCanvas] Image added and rendered, scale:', scale);
    console.info('[addImageToCanvas] fabric dimensions after normalization:', img.width, img.height);
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
