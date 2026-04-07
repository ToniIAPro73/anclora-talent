/**
 * Canvas Alignment Guides
 * Elegant premium visual guides for object alignment on canvas
 */

const GUIDE_COLOR = '#00a6c0'; // Accent color
const GUIDE_WIDTH = 2;
const SNAP_THRESHOLD = 10; // pixels

interface AlignmentGuide {
  id: string;
  line: any; // Fabric.js Line object
  type: 'vertical' | 'horizontal';
  position: number;
}

export class CanvasGuideManager {
  private canvas: any;
  private guides: Map<string, AlignmentGuide> = new Map();
  private activeObject: any = null;

  constructor(canvas: any) {
    this.canvas = canvas;
  }

  /**
   * Create a guide line on the canvas
   */
  private createGuideLine(x1: number, y1: number, x2: number, y2: number, type: 'vertical' | 'horizontal'): any {
    const fabric = require('fabric');

    const line = new fabric.Line([x1, y1, x2, y2], {
      stroke: GUIDE_COLOR,
      strokeWidth: GUIDE_WIDTH,
      selectable: false,
      evented: false,
      opacity: 0.6,
      strokeDasharray: [5, 5],
      perPixelTargetFind: false,
      hasBorders: false,
      hasControls: false,
    });

    return line;
  }

  /**
   * Show alignment guides when object is being moved
   */
  async showGuides(movingObject: any) {
    if (!this.canvas) return;

    this.clearGuides();
    this.activeObject = movingObject;

    const canvasWidth = this.canvas.width || 800;
    const canvasHeight = this.canvas.height || 600;
    const objLeft = movingObject.left || 0;
    const objTop = movingObject.top || 0;
    const objWidth = (movingObject.width || 0) * (movingObject.scaleX || 1);
    const objHeight = (movingObject.height || 0) * (movingObject.scaleY || 1);

    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    // Check vertical alignment (center X)
    if (Math.abs(objLeft + objWidth / 2 - centerX) < SNAP_THRESHOLD) {
      const line = this.createGuideLine(centerX, 0, centerX, canvasHeight, 'vertical');
      this.canvas.add(line);
      this.guides.set('center-v', { id: 'center-v', line, type: 'vertical', position: centerX });
    }

    // Check horizontal alignment (center Y)
    if (Math.abs(objTop + objHeight / 2 - centerY) < SNAP_THRESHOLD) {
      const line = this.createGuideLine(0, centerY, canvasWidth, centerY, 'horizontal');
      this.canvas.add(line);
      this.guides.set('center-h', { id: 'center-h', line, type: 'horizontal', position: centerY });
    }

    // Check alignment with other objects
    this.canvas.getObjects().forEach((obj: any) => {
      if (obj === movingObject || obj.type === 'line') return;

      const otherLeft = obj.left || 0;
      const otherTop = obj.top || 0;
      const otherWidth = (obj.width || 0) * (obj.scaleX || 1);
      const otherHeight = (obj.height || 0) * (obj.scaleY || 1);

      // Vertical alignment (left edges)
      if (Math.abs(objLeft - otherLeft) < SNAP_THRESHOLD) {
        const x = objLeft;
        const line = this.createGuideLine(x, 0, x, canvasHeight, 'vertical');
        this.canvas.add(line);
        this.guides.set(`left-${obj.id}`, { id: `left-${obj.id}`, line, type: 'vertical', position: x });
      }

      // Vertical alignment (right edges)
      if (Math.abs(objLeft + objWidth - (otherLeft + otherWidth)) < SNAP_THRESHOLD) {
        const x = objLeft + objWidth;
        const line = this.createGuideLine(x, 0, x, canvasHeight, 'vertical');
        this.canvas.add(line);
        this.guides.set(`right-${obj.id}`, { id: `right-${obj.id}`, line, type: 'vertical', position: x });
      }

      // Horizontal alignment (top edges)
      if (Math.abs(objTop - otherTop) < SNAP_THRESHOLD) {
        const y = objTop;
        const line = this.createGuideLine(0, y, canvasWidth, y, 'horizontal');
        this.canvas.add(line);
        this.guides.set(`top-${obj.id}`, { id: `top-${obj.id}`, line, type: 'horizontal', position: y });
      }

      // Horizontal alignment (bottom edges)
      if (Math.abs(objTop + objHeight - (otherTop + otherHeight)) < SNAP_THRESHOLD) {
        const y = objTop + objHeight;
        const line = this.createGuideLine(0, y, canvasWidth, y, 'horizontal');
        this.canvas.add(line);
        this.guides.set(`bottom-${obj.id}`, { id: `bottom-${obj.id}`, line, type: 'horizontal', position: y });
      }
    });

    this.canvas.renderAll();
  }

  /**
   * Snap object to guides if close enough
   */
  snapToGuides(object: any) {
    if (this.guides.size === 0) return;

    const objLeft = object.left || 0;
    const objTop = object.top || 0;
    const objWidth = (object.width || 0) * (object.scaleX || 1);
    const objHeight = (object.height || 0) * (object.scaleY || 1);

    this.guides.forEach((guide) => {
      if (guide.type === 'vertical') {
        // Snap to vertical guides
        const distance = Math.abs(objLeft - guide.position);
        if (distance < SNAP_THRESHOLD) {
          object.set({ left: guide.position });
        }
        // Snap right edge
        const rightDistance = Math.abs(objLeft + objWidth - guide.position);
        if (rightDistance < SNAP_THRESHOLD) {
          object.set({ left: guide.position - objWidth });
        }
      } else {
        // Snap to horizontal guides
        const distance = Math.abs(objTop - guide.position);
        if (distance < SNAP_THRESHOLD) {
          object.set({ top: guide.position });
        }
        // Snap bottom edge
        const bottomDistance = Math.abs(objTop + objHeight - guide.position);
        if (bottomDistance < SNAP_THRESHOLD) {
          object.set({ top: guide.position - objHeight });
        }
      }
    });
  }

  /**
   * Clear all guides from canvas
   */
  clearGuides() {
    this.guides.forEach((guide) => {
      this.canvas.remove(guide.line);
    });
    this.guides.clear();
  }

  /**
   * Hide guides with animation effect
   */
  hideGuidesWithAnimation() {
    if (this.guides.size === 0) return;

    // Fade out effect
    this.guides.forEach((guide) => {
      guide.line.set({ opacity: 0 });
    });

    this.canvas.renderAll();

    // Remove after animation
    setTimeout(() => {
      this.clearGuides();
      this.canvas.renderAll();
    }, 200);
  }

  /**
   * Cleanup
   */
  dispose() {
    this.clearGuides();
    this.canvas = null;
    this.guides.clear();
  }
}

export function createGuideManager(canvas: any): CanvasGuideManager {
  return new CanvasGuideManager(canvas);
}
