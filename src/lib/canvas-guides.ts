/**
 * Canvas Alignment Guides
 * Rich snapping guides with distance labels and persistent key-position helpers.
 */

import * as fabricModule from 'fabric';

const CANVAS_GUIDE_COLOR = '#38bdf8';
const OBJECT_GUIDE_COLOR = '#f59e0b';
const USER_GUIDE_SNAP_COLOR = '#a855f7';
const GUIDE_WIDTH = 2;
const SNAP_THRESHOLD_SCREEN_PX = 8;
const DISTANCE_COLOR = '#9fe7f2';
const DISTANCE_THRESHOLD = 140;

type GuideType = 'vertical' | 'horizontal' | 'distance-horizontal' | 'distance-vertical';
type Axis = 'x' | 'y';
type XAnchor = 'left' | 'center' | 'right';
type YAnchor = 'top' | 'center' | 'bottom';
type AlignmentSource = 'canvas' | 'object' | 'guide' | 'spacing';

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

interface FabricRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Subconjunto estructural de un objeto Fabric que usa el gestor de guías.
 * Los objetos reales (fabric.FabricObject y mocks de test) lo satisfacen.
 */
interface GuideObject {
  id?: string;
  type?: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  originX?: string;
  originY?: string;
  excludeFromExport?: boolean;
  visible?: boolean;
  getBoundingRect?(absolute?: boolean, calculate?: boolean): FabricRect;
  set(props: Record<string, unknown>): void;
}

export type { GuideObject };

/** Subconjunto estructural del canvas Fabric que usa el gestor de guías. */
export interface GuideCanvas {
  width?: number;
  height?: number;
  add(...objects: GuideObject[]): void;
  remove(...objects: GuideObject[]): void;
  renderAll(): void;
  getObjects(): GuideObject[];
}

interface AlignmentGuide {
  id: string;
  line: GuideObject;
  label?: GuideObject;
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
  priority: number;
}

interface EqualSpacingFeedback {
  axis: Axis;
  first: number;
  movingStart: number;
  movingEnd: number;
  last: number;
  gap: number;
  crossStart: number;
}

function getBounds(object: GuideObject): Bounds {
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
  object: GuideObject,
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
  private canvas: GuideCanvas | null;
  private guides: Map<string, AlignmentGuide> = new Map();
  private activeObject: GuideObject | null = null;
  private snapTargets: Partial<Record<Axis, SnapTarget>> = {};
  /** Cover Studio v2: persisted user guides (design-surface.ts's DesignGuide[]) — not canvas objects, so they need to be fed in explicitly to become snap targets (mission §15 lists guides alongside canvas/object edges). */
  private customGuides: { axis: Axis; position: number }[] = [];
  private zoom = 1;
  private equalSpacing: Partial<Record<Axis, EqualSpacingFeedback>> = {};

  constructor(canvas: GuideCanvas) {
    this.canvas = canvas;
  }

  /** Replaces the set of persisted guides this manager snaps to. Call whenever the surface's own `guides` array changes. */
  setCustomGuides(guides: Array<{ axis: Axis; position: number }>): void {
    this.customGuides = guides;
  }

  /** Keeps the snap feel stable: the threshold is measured in screen pixels, not document pixels. */
  setZoom(zoom: number): void {
    this.zoom = Math.max(0.01, zoom);
  }

  private getSnapThreshold(): number {
    return SNAP_THRESHOLD_SCREEN_PX / this.zoom;
  }

  private get fabric() {
    return fabricModule as unknown as {
      Line: new (points: number[], options: Record<string, unknown>) => GuideObject;
      Text: new (text: string, options: Record<string, unknown>) => GuideObject;
    };
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
          : source === 'guide'
            ? USER_GUIDE_SNAP_COLOR
            : source === 'spacing'
              ? DISTANCE_COLOR
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
    line: GuideObject,
    label?: GuideObject,
    source: AlignmentSource | 'distance' = 'canvas',
  ) {
    this.canvas!.add(line);
    if (label) this.canvas!.add(label);
    this.guides.set(id, { id, type, position, line, label, source });
  }

  private getCanvasAlignmentTargets(canvasWidth: number, canvasHeight: number) {
    return {
      x: [
        { anchor: 'left' as const, position: 0, priority: 6 },
        { anchor: 'center' as const, position: canvasWidth / 2, priority: 1 },
        { anchor: 'right' as const, position: canvasWidth, priority: 6 },
      ],
      y: [
        { anchor: 'top' as const, position: 0, priority: 6 },
        { anchor: 'center' as const, position: canvasHeight / 2, priority: 1 },
        { anchor: 'bottom' as const, position: canvasHeight, priority: 6 },
      ],
    };
  }

  private findBestSnapTarget(movingObject: GuideObject, bounds: Bounds) {
    const canvasWidth = this.canvas!.width || 800;
    const canvasHeight = this.canvas!.height || 600;
    const canvasTargets = this.getCanvasAlignmentTargets(canvasWidth, canvasHeight);
    let bestX: SnapTarget | null = null;
    let bestY: SnapTarget | null = null;
    const threshold = this.getSnapThreshold();
    const consider = (candidate: SnapTarget) => {
      if (candidate.distance > threshold) return;
      const current = candidate.axis === 'x' ? bestX : bestY;
      if (!current || candidate.priority < current.priority || (candidate.priority === current.priority && candidate.distance < current.distance)) {
        if (candidate.axis === 'x') bestX = candidate;
        else bestY = candidate;
      }
    };

    for (const candidate of canvasTargets.x) {
      for (const anchor of ['left', 'center', 'right'] as const) {
        const distance = Math.abs(getAnchorValue(bounds, 'x', anchor) - candidate.position);
        consider({ axis: 'x', anchor, position: candidate.position, distance, source: 'canvas', priority: candidate.priority });
      }
    }

    for (const candidate of canvasTargets.y) {
      for (const anchor of ['top', 'center', 'bottom'] as const) {
        const distance = Math.abs(getAnchorValue(bounds, 'y', anchor) - candidate.position);
        consider({ axis: 'y', anchor, position: candidate.position, distance, source: 'canvas', priority: candidate.priority });
      }
    }

    // Persisted user guides (mission §15) — checked against the object's
    // near edge only (a guide is a single line, not a box with left/center/
    // right anchors of its own).
    for (const guide of this.customGuides) {
      const anchors = guide.axis === 'x' ? (['left', 'center', 'right'] as const) : (['top', 'center', 'bottom'] as const);
      for (const anchor of anchors) {
        const distance = Math.abs(getAnchorValue(bounds, guide.axis, anchor) - guide.position);
        consider({
          axis: guide.axis,
          anchor: anchor as XAnchor | YAnchor,
          position: guide.position,
          distance,
          source: 'guide',
          priority: 4,
        });
      }
    }

    this.canvas!.getObjects().forEach((obj) => {
      if (obj === movingObject || obj?.visible === false || obj?.type === 'line' || obj?.type === 'text' && obj?.excludeFromExport) return;

      const other = getBounds(obj);

      for (const anchor of ['left', 'center', 'right'] as const) {
        for (const otherAnchor of ['left', 'center', 'right'] as const) {
          const distance = Math.abs(getAnchorValue(bounds, 'x', anchor) - getAnchorValue(other, 'x', otherAnchor));
          consider({ axis: 'x', anchor, position: getAnchorValue(other, 'x', otherAnchor), distance, source: 'object', priority: 3 });
        }
      }

      for (const anchor of ['top', 'center', 'bottom'] as const) {
        for (const otherAnchor of ['top', 'center', 'bottom'] as const) {
          const distance = Math.abs(getAnchorValue(bounds, 'y', anchor) - getAnchorValue(other, 'y', otherAnchor));
          consider({ axis: 'y', anchor, position: getAnchorValue(other, 'y', otherAnchor), distance, source: 'object', priority: 3 });
        }
      }
    });

    this.snapTargets = {
      x: bestX ?? undefined,
      y: bestY ?? undefined,
    };
    this.findEqualSpacingTarget(movingObject, bounds, threshold);
  }

  private findEqualSpacingTarget(movingObject: GuideObject, moving: Bounds, threshold: number): void {
    const others = this.canvas!.getObjects().filter(
      (obj) => obj !== movingObject && obj.visible !== false && obj.type !== 'line' && !(obj.type === 'text' && obj.excludeFromExport),
    );
    const best: Partial<Record<Axis, { target: SnapTarget; feedback: EqualSpacingFeedback }>> = {};

    for (let firstIndex = 0; firstIndex < others.length; firstIndex += 1) {
      for (let lastIndex = firstIndex + 1; lastIndex < others.length; lastIndex += 1) {
        const first = getBounds(others[firstIndex]);
        const last = getBounds(others[lastIndex]);
        const horizontalOverlap = overlappingRange(moving.left, moving.right, first.left, first.right) && overlappingRange(moving.left, moving.right, last.left, last.right);
        if (horizontalOverlap) {
          const upper = first.bottom <= last.top ? first : last.bottom <= first.top ? last : null;
          const lower = upper === first ? last : upper === last ? first : null;
          if (upper && lower) {
            const total = lower.top - upper.bottom - moving.height;
            const gap = total / 2;
            const targetTop = upper.bottom + gap;
            const distance = Math.abs(moving.top - targetTop);
            if (gap >= 0 && distance <= threshold && (!best.y || distance < best.y.target.distance)) {
              best.y = {
                target: { axis: 'y', anchor: 'top', position: targetTop, distance, source: 'spacing', priority: 2 },
                feedback: { axis: 'y', first: upper.bottom, movingStart: targetTop, movingEnd: targetTop + moving.height, last: lower.top, gap, crossStart: Math.max(moving.left, upper.left, lower.left) },
              };
            }
          }
        }

        const verticalOverlap = overlappingRange(moving.top, moving.bottom, first.top, first.bottom) && overlappingRange(moving.top, moving.bottom, last.top, last.bottom);
        if (verticalOverlap) {
          const left = first.right <= last.left ? first : last.right <= first.left ? last : null;
          const right = left === first ? last : left === last ? first : null;
          if (left && right) {
            const total = right.left - left.right - moving.width;
            const gap = total / 2;
            const targetLeft = left.right + gap;
            const distance = Math.abs(moving.left - targetLeft);
            if (gap >= 0 && distance <= threshold && (!best.x || distance < best.x.target.distance)) {
              best.x = {
                target: { axis: 'x', anchor: 'left', position: targetLeft, distance, source: 'spacing', priority: 2 },
                feedback: { axis: 'x', first: left.right, movingStart: targetLeft, movingEnd: targetLeft + moving.width, last: right.left, gap, crossStart: Math.max(moving.top, left.top, right.top) },
              };
            }
          }
        }
      }
    }

    if (best.x) this.snapTargets.x = best.x.target;
    if (best.y) this.snapTargets.y = best.y.target;
    this.equalSpacing = { x: best.x?.feedback, y: best.y?.feedback };
  }

  private drawSnapGuides() {
    const canvasWidth = this.canvas!.width || 800;
    const canvasHeight = this.canvas!.height || 600;

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

  private drawDistanceGuides(movingObject: GuideObject, bounds: Bounds) {
    let bestHorizontal: { gap: number; x1: number; x2: number; y: number } | null = null;
    let bestVertical: { gap: number; y1: number; y2: number; x: number } | null = null;

    this.canvas!.getObjects().forEach((obj) => {
      if (obj === movingObject || obj?.visible === false || obj?.type === 'line' || obj?.excludeFromExport) return;

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

    // Las asignaciones dentro del forEach no las ve el control-flow analysis
    // de TS (quedaría estrechado a null); re-leer con el tipo declarado.
    const finalHorizontal = bestHorizontal as { gap: number; x1: number; x2: number; y: number } | null;
    const finalVertical = bestVertical as { gap: number; y1: number; y2: number; x: number } | null;

    if (finalHorizontal && finalHorizontal.gap > 0) {
      const line = this.createGuideLine(
        finalHorizontal.x1,
        finalHorizontal.y,
        finalHorizontal.x2,
        finalHorizontal.y,
        'distance-horizontal',
        'distance',
      );
      const label = this.createDistanceLabel(
        `${roundPx(finalHorizontal.gap)} px`,
        finalHorizontal.x1 + (finalHorizontal.x2 - finalHorizontal.x1) / 2,
        finalHorizontal.y - 12,
      );
      this.registerGuide('distance-horizontal', 'distance-horizontal', finalHorizontal.gap, line, label, 'distance');
    }

    if (finalVertical && finalVertical.gap > 0) {
      const line = this.createGuideLine(
        finalVertical.x,
        finalVertical.y1,
        finalVertical.x,
        finalVertical.y2,
        'distance-vertical',
        'distance',
      );
      const label = this.createDistanceLabel(
        `${roundPx(finalVertical.gap)} px`,
        finalVertical.x + 20,
        finalVertical.y1 + (finalVertical.y2 - finalVertical.y1) / 2,
      );
      this.registerGuide('distance-vertical', 'distance-vertical', finalVertical.gap, line, label, 'distance');
    }
  }

  private drawEqualSpacingGuides() {
    for (const feedback of Object.values(this.equalSpacing)) {
      if (!feedback || feedback.gap <= 0) continue;
      const isHorizontal = feedback.axis === 'x';
      const firstLine = isHorizontal
        ? this.createGuideLine(feedback.first, feedback.crossStart, feedback.movingStart, feedback.crossStart, 'distance-horizontal', 'spacing')
        : this.createGuideLine(feedback.crossStart, feedback.first, feedback.crossStart, feedback.movingStart, 'distance-vertical', 'spacing');
      const secondLine = isHorizontal
        ? this.createGuideLine(feedback.movingEnd, feedback.crossStart, feedback.last, feedback.crossStart, 'distance-horizontal', 'spacing')
        : this.createGuideLine(feedback.crossStart, feedback.movingEnd, feedback.crossStart, feedback.last, 'distance-vertical', 'spacing');
      const firstLabel = this.createDistanceLabel(`${roundPx(feedback.gap)} px`, isHorizontal ? (feedback.first + feedback.movingStart) / 2 : feedback.crossStart + 20, isHorizontal ? feedback.crossStart - 12 : (feedback.first + feedback.movingStart) / 2);
      const secondLabel = this.createDistanceLabel(`${roundPx(feedback.gap)} px`, isHorizontal ? (feedback.movingEnd + feedback.last) / 2 : feedback.crossStart + 20, isHorizontal ? feedback.crossStart - 12 : (feedback.movingEnd + feedback.last) / 2);
      this.registerGuide(`equal-spacing-${feedback.axis}-first`, isHorizontal ? 'distance-horizontal' : 'distance-vertical', feedback.gap, firstLine, firstLabel, 'spacing');
      this.registerGuide(`equal-spacing-${feedback.axis}-second`, isHorizontal ? 'distance-horizontal' : 'distance-vertical', feedback.gap, secondLine, secondLabel, 'spacing');
    }
  }

  async showGuides(movingObject: GuideObject) {
    if (!this.canvas) return;

    this.clearGuides();
    this.activeObject = movingObject;

    const bounds = getBounds(movingObject);
    this.findBestSnapTarget(movingObject, bounds);
    this.drawSnapGuides();
    this.drawEqualSpacingGuides();
    this.drawDistanceGuides(movingObject, bounds);
    this.canvas.renderAll();
  }

  snapToGuides(object: GuideObject) {
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
      if (guide.label) this.canvas!.remove(guide.label);
      this.canvas!.remove(guide.line);
    });
    this.guides.clear();
    this.snapTargets = {};
    this.equalSpacing = {};
  }

  hideGuidesWithAnimation() {
    if (this.guides.size === 0) return;

    this.guides.forEach((guide) => {
      guide.line.set({ opacity: 0 });
      guide.label?.set?.({ opacity: 0 });
    });

    this.canvas!.renderAll();

    setTimeout(() => {
      this.clearGuides();
      this.canvas!.renderAll();
    }, 200);
  }

  dispose() {
    this.clearGuides();
    this.canvas = null;
    this.guides.clear();
  }
}

export function createGuideManager(canvas: GuideCanvas): CanvasGuideManager {
  return new CanvasGuideManager(canvas);
}
