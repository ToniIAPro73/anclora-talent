import { describe, expect, it, vi, beforeEach } from 'vitest';

interface MockShape {
  type: string;
  points?: number[];
  text?: string;
  options?: Record<string, unknown>;
  set: ReturnType<typeof vi.fn>;
}

const mocks = vi.hoisted(() => {
  const LineMock = vi.fn(function LineMock(this: MockShape, points: number[], options: Record<string, unknown>) {
    this.type = 'line';
    this.points = points;
    this.options = options;
    this.set = vi.fn();
  });

  const TextMock = vi.fn(function TextMock(this: MockShape, text: string, options: Record<string, unknown>) {
    this.type = 'text';
    this.text = text;
    this.options = options;
    this.set = vi.fn();
  });

  return { LineMock, TextMock };
});

vi.mock('fabric', () => ({
  Line: mocks.LineMock,
  Text: mocks.TextMock,
}));

import { createGuideManager } from './canvas-guides';

interface MockCanvasObject {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  originX: string;
  originY: string;
  set: (props: Record<string, unknown>) => void;
}

function makeCanvas(objects: MockCanvasObject[] = []) {
  return {
    width: 400,
    height: 600,
    add: vi.fn(),
    remove: vi.fn(),
    renderAll: vi.fn(),
    getObjects: vi.fn(() => objects),
  };
}

function makeObject(input: Partial<MockCanvasObject>): MockCanvasObject {
  return {
    id: 'obj',
    left: 0,
    top: 0,
    width: 100,
    height: 40,
    scaleX: 1,
    scaleY: 1,
    originX: 'center',
    originY: 'center',
    set: vi.fn(function (this: Record<string, unknown>, props: Record<string, unknown>) {
      Object.assign(this, props);
    }),
    ...input,
  };
}

describe('CanvasGuideManager', () => {
  beforeEach(() => {
    mocks.LineMock.mockClear();
    mocks.TextMock.mockClear();
  });

  it('shows center guides when an object is near the canvas center', async () => {
    const moving = makeObject({ left: 198, top: 302, width: 100, height: 40 });
    const canvas = makeCanvas([moving]);
    const manager = createGuideManager(canvas);

    await manager.showGuides(moving);

    expect(mocks.LineMock).toHaveBeenCalled();
    expect(canvas.add).toHaveBeenCalled();
  });

  it('snaps the object to the nearest aligned canvas guide', async () => {
    const moving = makeObject({ left: 196, top: 300, width: 100, height: 40 });
    const canvas = makeCanvas([moving]);
    const manager = createGuideManager(canvas);

    await manager.showGuides(moving);
    manager.snapToGuides(moving);

    expect(moving.set).toHaveBeenCalled();
  });

  it('snaps to a persisted user guide (Cover Studio v2, mission §15)', async () => {
    const moving = makeObject({ left: 253, top: 300, width: 100, height: 40 });
    const canvas = makeCanvas([moving]);
    const manager = createGuideManager(canvas);
    manager.setCustomGuides([{ axis: 'x', position: 250 }]);

    await manager.showGuides(moving);
    manager.snapToGuides(moving);

    // originX 'center' -> left ends up at the guide position exactly.
    expect(moving.left).toBe(250);
  });

  it('a user guide far from the moving object is never a snap target', async () => {
    const moving = makeObject({ left: 300, top: 300, width: 100, height: 40 });
    const canvas = makeCanvas([moving]);
    const manager = createGuideManager(canvas);
    manager.setCustomGuides([{ axis: 'x', position: 30 }]);

    await manager.showGuides(moving);
    manager.snapToGuides(moving);

    expect(moving.left).toBe(300);
  });

  it('shows distance labels in px when nearby objects leave a measurable gap', async () => {
    const moving = makeObject({ id: 'moving', left: 220, top: 200, width: 100, height: 50 });
    const other = makeObject({ id: 'other', left: 100, top: 200, width: 80, height: 50 });
    const canvas = makeCanvas([moving, other]);
    const manager = createGuideManager(canvas);

    await manager.showGuides(moving);

    expect(mocks.TextMock).toHaveBeenCalledWith(expect.stringMatching(/px$/), expect.any(Object));
  });

  it('ignores hidden layers while finding smart-guide references', async () => {
    const moving = makeObject({ id: 'moving', left: 196, top: 300, width: 100, height: 40 });
    const hidden = makeObject({ id: 'hidden', left: 200, top: 300, width: 100, height: 40 });
    (hidden as MockCanvasObject & { visible?: boolean }).visible = false;
    const canvas = makeCanvas([moving, hidden]);
    const manager = createGuideManager(canvas);

    await manager.showGuides(moving);
    manager.snapToGuides(moving);

    // The canvas center remains the meaningful target; the hidden object must
    // not create a competing object guide.
    expect(moving.set).toHaveBeenCalled();
  });

  it('keeps the screen-space snap feel stable when zoom changes', async () => {
    const moving = makeObject({ id: 'moving', left: 211, top: 300, width: 100, height: 40 });
    const canvas = makeCanvas([moving]);
    const manager = createGuideManager(canvas);
    manager.setZoom(2);

    await manager.showGuides(moving);
    manager.snapToGuides(moving);

    expect(moving.left).toBe(211);
  });

  it('shows equal spacing feedback and snaps the middle layer between two layers', async () => {
    const first = makeObject({ id: 'first', left: 200, top: 100, width: 100, height: 40 });
    const moving = makeObject({ id: 'moving', left: 200, top: 202, width: 100, height: 40 });
    const last = makeObject({ id: 'last', left: 200, top: 300, width: 100, height: 40 });
    const canvas = makeCanvas([first, moving, last]);
    const manager = createGuideManager(canvas);

    await manager.showGuides(moving);
    manager.snapToGuides(moving);

    expect(moving.top).toBe(200);
    expect(mocks.TextMock.mock.calls.filter(([text]) => text === '60 px').length).toBeGreaterThanOrEqual(2);
  });

  it('measures a dragged object from fresh coordinates, so it never snaps back to where the drag started', async () => {
    // Fabric derives getBoundingRect() from cached corner coordinates that are only
    // refreshed by setCoords(); mid-drag the cache still holds the drag-start value.
    const cache = { left: 0, top: 143 };
    const moving: MockCanvasObject & { setCoords(): void; getBoundingRect(): { left: number; top: number; width: number; height: number } } = {
      id: 'moving',
      left: 0,
      top: 143,
      width: 352,
      height: 76,
      scaleX: 1,
      scaleY: 1,
      originX: 'left',
      originY: 'top',
      set(props: Record<string, unknown>) {
        Object.assign(moving, props);
      },
      setCoords() {
        cache.left = moving.left;
        cache.top = moving.top;
      },
      getBoundingRect() {
        return { left: cache.left, top: cache.top, width: moving.width, height: moving.height };
      },
    };
    const canvas = makeCanvas([moving]);
    const manager = createGuideManager(canvas);

    // The user has dragged the box 60px to the right; the cache still says left = 0.
    moving.left = 60;

    await manager.showGuides(moving);
    manager.snapToGuides(moving);

    expect(moving.left).toBe(60);
  });

  it('snapping one axis never changes the other', async () => {
    const moving = makeObject({ left: 196, top: 77, width: 100, height: 40, originX: 'left', originY: 'top' });
    const canvas = makeCanvas([moving]);
    const manager = createGuideManager(canvas);

    await manager.showGuides(moving);
    manager.snapToGuides(moving);

    expect(moving.top).toBe(77); // far from any horizontal target: Y untouched
  });

  it('derives the canvas centre from the surface, not from the zoomed canvas element', async () => {
    // surface 400x600 shown at 50%: the canvas element is 200x300 screen px
    const moving = makeObject({ left: 146, top: 300, width: 100, height: 40, originX: 'left', originY: 'top' });
    const canvas = { ...makeCanvas([moving]), width: 200, height: 300 };
    const manager = createGuideManager(canvas);
    manager.setZoom(0.5);

    await manager.showGuides(moving);
    manager.snapToGuides(moving);

    // centre of a 400px surface is 200: a 100px-wide box snaps to left = 150
    expect(moving.left).toBe(150);
  });
});
