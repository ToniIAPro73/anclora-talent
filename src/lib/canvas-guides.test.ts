import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const LineMock = vi.fn(function LineMock(this: any, points, options) {
    this.type = 'line';
    this.points = points;
    this.options = options;
    this.set = vi.fn();
  });

  const TextMock = vi.fn(function TextMock(this: any, text, options) {
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

function makeCanvas(objects: any[] = []) {
  return {
    width: 400,
    height: 600,
    add: vi.fn(),
    remove: vi.fn(),
    renderAll: vi.fn(),
    getObjects: vi.fn(() => objects),
  };
}

function makeObject(input: Partial<any>) {
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
    set: vi.fn(function (props: Record<string, unknown>) {
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

  it('shows distance labels in px when nearby objects leave a measurable gap', async () => {
    const moving = makeObject({ id: 'moving', left: 220, top: 200, width: 100, height: 50 });
    const other = makeObject({ id: 'other', left: 100, top: 200, width: 80, height: 50 });
    const canvas = makeCanvas([moving, other]);
    const manager = createGuideManager(canvas);

    await manager.showGuides(moving);

    expect(mocks.TextMock).toHaveBeenCalledWith(expect.stringMatching(/px$/), expect.any(Object));
  });
});
