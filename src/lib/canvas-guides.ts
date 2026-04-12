/**
 * Canvas Alignment Guides
 * Rich snapping guides with distance labels and persistent key-position helpers.
 */

import * as fabricModule from 'fabric';

const CANVAS_GUIDE_COLOR = '#38bdf8';
const OBJECT_GUIDE_COLOR = '#f59e0b';
const GUIDE_WIDTH = 2;
const SNAP_THRESHOLD = 10;
const DISTANCE_COLOR = '#9fe7f2';
const DISTANCE_THRESHOLD = 140;

type GuideType = 'vertical' | 'horizontal' | 'distance-horizontal' | 'distance-vertical';
type Axis = 'x' | 'y';
type XAnchor = 'left' | 'center' | 'right';
type YAnchor = 'top' | 'center' | 'bottom';
type AlignmentSource = 'canvas' | 'object';

interface Bounds {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

interface AlignmentGuide {
  id: string;
  line: any;
  label?: any;
  type: GuideType;
  position: number;
  source?: AlignmentSource | 'distance';
}

interface SnapTarget {
  axis: Axis;
  anchor: XAnchor | YAnchor;
  position: number;
  distance: number;
  source: AlignmentSource;
}

function getBounds(object: any): Bounds {
  if (typeof object?.getBoundingRect === 'function') {
    const rect = object.getBoundingRect(true, true);
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
    };
  }

  const width = (object?.width || 0) * (object?.scaleX || 1);
  const height = (object?.height || 0) * (object?.scaleY || 1);
  const originX = object?.originX || 'left';
  const originY = object?.originY || 'top';
  const leftValue = object?.left || 0;
  const topValue = object?.top || 0;

  const left =
    originX === 'center' ? leftValue - width / 2
      : originX === 'right' ? leftValue - width
      : leftValue;
  const top =
    originY === 'center' ? topValue - height / 2
      : originY === 'bottom' ? topValue - height
      : topValue;

  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    centerX: left + width / 2,
    centerY: top + height / 2,
  };
}

function getAnchorValue(bounds: Bounds, axis: Axis, anchor: XAnchor | YAnchor) {
  if (axis === 'x') {
    if (anchor === 'left') return bounds.left;
    if (anchor === 'center') return bounds.centerX;
    return bounds.right;
  }

  if (anchor === 'top') return bounds.top;
  if (anchor === 'center') return bounds.centerY;
  return bounds.bottom;
}

function calculateOriginCoordinate(
  object: any,
  bounds: Bounds,
  axis: Axis,
  anchor: XAnchor | YAnchor,
  position: number,
) {
  const origin = axis === 'x' ? (object?.originX || 'left') : (object?.originY || 'top');
  const size = axis === 'x' ? bounds.width : bounds.height;
  const alignedEdge =
    anchor === 'left' || anchor === 'top'
      ? position
      : anchor === 'center'
        ? position - size / 2
        : position - size;

  if (origin === 'center') return alignedEdge + size / 2;
  if (origin === 'right' || origin === 'bottom') return alignedEdge + size;
  return alignedEdge;
}

function overlappingRange(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  const start = Math.max(aStart, bStart);
  const end = Math.min(aEnd, bEnd);
  return end > start ? { start, end } : null;
}

function roundPx(value: number) {
  return Math.round(value);
}

export class CanvasGuideManager {
  private canvas: any;
  private guides: Map<string, AlignmentGuide> = new Map();
  private activeObject: any = null;
  private snapTargets: Partial<Record<Axis, SnapTarget>> = {};

  constructor(canvas: any) {
    this.canvas = canvas;
  }

  private get fabric() {
    return fabricModule as any;
  }

  private createGuideLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    type: GuideType,
    source: AlignmentSource | 'distance' = 'canvas',
  ) {
    const fabric = this.fabric;
    const isDistance = type.startsWith('distance');
    const stroke =
      source === 'distance'
        ? DISTANCE_COLOR
        : source === 'object'
          ? OBJECT_GUIDE_COLOR
          : CANVAS_GUIDE_COLOR;

    return new fabric.Line([x1, y1, x2, y2], {
      stroke,
      strokeWidth: isDistance ? 1.5 : GUIDE_WIDTH,
      selectable: false,
      evented: false,
      opacity: source === 'canvas' ? 0.78 : 0.92,
      strokeDasharray: isDistance ? [3, 3] : source === 'canvas' ? [6, 6] : [2, 0],
      perPixelTargetFind: false,
      hasBorders: false,
      hasControls: false,
      excludeFromExport: true,
    });
  }

  private createDistanceLabel(text: string, left: number, top: number) {
    const fabric = this.fabric;

    return new fabric.Text(text, {
      left,
      top,
      originX: 'center',
      originY: 'center',
      fill: DISTANCE_COLOR,
      backgroundColor: 'rgba(4, 10, 18, 0.92)',
      fontSize: 11,
      fontWeight: 700,
      fontFamily: 'Arial',
      selectable: false,
      evented: false,
      hasBorders: false,
      hasControls: false,
      excludeFromExport: true,
      rx: 8,
      ry: 8,
      stroke: 'rgba(159, 231, 242, 0.35)',
      strokeWidth: 0.4,
      shadow: '0 2px 10px rgba(0,0,0,0.28)',
      padding: 5,
    });
  }

  private registerGuide(
    id: string,
    type: GuideType,
    position: number,
    line: any,
    label?: any,
    source: AlignmentSource | 'distance' = 'canvas',
  ) {
    this.canvas.add(line);
    if (label) this.canvas.add(label);
    this.guides.set(id, { id, type, position, line, label, source });
  }

  private getCanvasAlignmentTargets(canvasWidth: number, canvasHeight: number) {
    return {
      x: [
        { anchor: 'left' as const, position: 0 },
        { anchor: 'center' as const, position: canvasWidth / 2 },
        { anchor: 'right' as const, position: canvasWidth },
      ],
      y: [
        { anchor: 'top' as const, position: 0 },
        { anchor: 'center' as const, position: canvasHeight / 2 },
        { anchor: 'bottom' as const, position: canvasHeight },
      ],
    };
  }

  private findBestSnapTarget(movingObject: any, bounds: Bounds) {
    const canvasWidth = this.canvas.width || 800;
    const canvasHeight = this.canvas.height || 600;
    const canvasTargets = this.getCanvasAlignmentTargets(canvasWidth, canvasHeight);
    let bestX: SnapTarget | null = null;
    let bestY: SnapTarget | null = null;

    for (const candidate of canvasTargets.x) {
      for (const anchor of ['left', 'center', 'right'] as const) {
        const distance = Math.abs(getAnchorValue(bounds, 'x', anchor) - candidate.position);
        if (distance > SNAP_THRESHOLD) continue;
        if (!bestX || distance < bestX.distance) {
          bestX = { axis: 'x', anchor, position: candidate.position, distance, source: 'canvas' };
        }
      }
    }

    for (const candidate of canvasTargets.y) {
      for (const anchor of ['top', 'center', 'bottom'] as const) {
        const distance = Math.abs(getAnchorValue(bounds, 'y', anchor) - candidate.position);
        if (distance > SNAP_THRESHOLD) continue;
        if (!bestY || distance < bestY.distance) {
          bestY = { axis: 'y', anchor, position: candidate.position, distance, source: 'canvas' };
        }
      }
    }

    this.canvas.getObjects().forEach((obj: any) => {
      if (obj === movingObject || obj?.type === 'line' || obj?.type === 'text' && obj?.excludeFromExport) return;

      const other = getBounds(obj);

      for (const anchor of ['left', 'center', 'right'] as const) {
        for (const otherAnchor of ['left', 'center', 'right'] as const) {
          const distance = Math.abs(getAnchorValue(bounds, 'x', anchor) - getAnchorValue(other, 'x', otherAnchor));
          if (distance > SNAP_THRESHOLD) continue;
          if (!bestX || distance < bestX.distance) {
            bestX = {
              axis: 'x',
              anchor,
              position: getAnchorValue(other, 'x', otherAnchor),
              distance,
              source: 'object',
            };
          }
        }
      }

      for (const anchor of ['top', 'center', 'bottom'] as const) {
        for (const otherAnchor of ['top', 'center', 'bottom'] as const) {
          const distance = Math.abs(getAnchorValue(bounds, 'y', anchor) - getAnchorValue(other, 'y', otherAnchor));
          if (distance > SNAP_THRESHOLD) continue;
          if (!bestY || distance < bestY.distance) {
            bestY = {
              axis: 'y',
              anchor,
              position: getAnchorValue(other, 'y', otherAnchor),
              distance,
              source: 'object',
            };
          }
        }
      }
    });

    this.snapTargets = {
      x: bestX ?? undefined,
      y: bestY ?? undefined,
    };
  }

  private drawSnapGuides(bounds: Bounds) {
    const canvasWidth = this.canvas.width || 800;
    const canvasHeight = this.canvas.height || 600;

    const xSnap = this.snapTargets.x;
    if (xSnap) {
      const x = xSnap.position;
      const line = this.createGuideLine(x, 0, x, canvasHeight, 'vertical', xSnap.source);
      this.registerGuide(`snap-x-${x}`, 'vertical', x, line, undefined, xSnap.source);
    }

    const ySnap = this.snapTargets.y;
    if (ySnap) {
      const y = ySnap.position;
      const line = this.createGuideLine(0, y, canvasWidth, y, 'horizontal', ySnap.source);
      this.registerGuide(`snap-y-${y}`, 'horizontal', y, line, undefined, ySnap.source);
    }
  }

  private drawDistanceGuides(movingObject: any, bounds: Bounds) {
    let bestHorizontal: { gap: number; x1: number; x2: number; y: number } | null = null;
    let bestVertical: { gap: number; y1: number; y2: number; x: number } | null = null;

    this.canvas.getObjects().forEach((obj: any) => {
      if (obj === movingObject || obj?.type === 'line' || obj?.excludeFromExport) return;

      const other = getBounds(obj);
      const verticalOverlap = overlappingRange(bounds.top, bounds.bottom, other.top, other.bottom);
      const horizontalOverlap = overlappingRange(bounds.left, bounds.right, other.left, other.right);

      if (verticalOverlap) {
        const y = verticalOverlap.start + (verticalOverlap.end - verticalOverlap.start) / 2;

        if (other.right <= bounds.left) {
          const gap = bounds.left - other.right;
          if (gap <= DISTANCE_THRESHOLD && (!bestHorizontal || gap < bestHorizontal.gap)) {
            bestHorizontal = { gap, x1: other.right, x2: bounds.left, y };
          }
        } else if (bounds.right <= other.left) {
          const gap = other.left - bounds.right;
          if (gap <= DISTANCE_THRESHOLD && (!bestHorizontal || gap < bestHorizontal.gap)) {
            bestHorizontal = { gap, x1: bounds.right, x2: other.left, y };
          }
        }
      }

      if (horizontalOverlap) {
        const x = horizontalOverlap.start + (horizontalOverlap.end - horizontalOverlap.start) / 2;

        if (other.bottom <= bounds.top) {
          const gap = bounds.top - other.bottom;
          if (gap <= DISTANCE_THRESHOLD && (!bestVertical || gap < bestVertical.gap)) {
            bestVertical = { gap, y1: other.bottom, y2: bounds.top, x };
          }
        } else if (bounds.bottom <= other.top) {
          const gap = other.top - bounds.bottom;
          if (gap <= DISTANCE_THRESHOLD && (!bestVertical || gap < bestVertical.gap)) {
            bestVertical = { gap, y1: bounds.bottom, y2: other.top, x };
          }
        }
      }
    });

    if (bestHorizontal && bestHorizontal.gap > 0) {
      const line = this.createGuideLine(
        bestHorizontal.x1,
        bestHorizontal.y,
        bestHorizontal.x2,
        bestHorizontal.y,
        'distance-horizontal',
        'distance',
      );
      const label = this.createDistanceLabel(
        `${roundPx(bestHorizontal.gap)} px`,
        bestHorizontal.x1 + (bestHorizontal.x2 - bestHorizontal.x1) / 2,
        bestHorizontal.y - 12,
      );
      this.registerGuide('distance-horizontal', 'distance-horizontal', bestHorizontal.gap, line, label, 'distance');
    }

    if (bestVertical && bestVertical.gap > 0) {
      const line = this.createGuideLine(
        bestVertical.x,
        bestVertical.y1,
        bestVertical.x,
        bestVertical.y2,
        'distance-vertical',
        'distance',
      );
      const label = this.createDistanceLabel(
        `${roundPx(bestVertical.gap)} px`,
        bestVertical.x + 20,
        bestVertical.y1 + (bestVertical.y2 - bestVertical.y1) / 2,
      );
      this.registerGuide('distance-vertical', 'distance-vertical', bestVertical.gap, line, label, 'distance');
    }
  }

  async showGuides(movingObject: any) {
    if (!this.canvas) return;

    this.clearGuides();
    this.activeObject = movingObject;

    const bounds = getBounds(movingObject);
    this.findBestSnapTarget(movingObject, bounds);
    this.drawSnapGuides(bounds);
    this.drawDistanceGuides(movingObject, bounds);
    this.canvas.renderAll();
  }

  snapToGuides(object: any) {
    const bounds = getBounds(object);

    const xSnap = this.snapTargets.x;
    if (xSnap) {
      object.set({
        left: calculateOriginCoordinate(object, bounds, 'x', xSnap.anchor, xSnap.position),
      });
    }

    const updatedBounds = getBounds(object);
    const ySnap = this.snapTargets.y;
    if (ySnap) {
      object.set({
        top: calculateOriginCoordinate(object, updatedBounds, 'y', ySnap.anchor, ySnap.position),
      });
    }
  }

  clearGuides() {
    this.guides.forEach((guide) => {
      if (guide.label) this.canvas.remove(guide.label);
      this.canvas.remove(guide.line);
    });
    this.guides.clear();
    this.snapTargets = {};
  }

  hideGuidesWithAnimation() {
    if (this.guides.size === 0) return;

    this.guides.forEach((guide) => {
      guide.line.set({ opacity: 0 });
      guide.label?.set?.({ opacity: 0 });
    });

    this.canvas.renderAll();

    setTimeout(() => {
      this.clearGuides();
      this.canvas.renderAll();
    }, 200);
  }

  dispose() {
    this.clearGuides();
    this.canvas = null;
    this.guides.clear();
  }
}

export function createGuideManager(canvas: any): CanvasGuideManager {
  return new CanvasGuideManager(canvas);
}
