// pixiShapes.ts - Pixi.js-based shape classes using retained mode

import * as PIXI from 'pixi.js';
import { Point, Quad, TileLabel, ColorMap, TransformMatrix } from './types';
import { psub, pt, pframe, transPt, mul } from './math';

/**
 * Check if a tile is outside the viewport bounds
 */
function isTileOutsideBounds(
  pts: Point[],
  transform: PIXI.Matrix,
  boundingBoxWidth: number,
  boundingBoxHeight: number,
  viewWidth: number,
  viewHeight: number
): boolean {
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  for (const p of pts) {
    const transformed = transform.apply({ x: p.x, y: p.y });

    minX = Math.min(minX, transformed.x);
    maxX = Math.max(maxX, transformed.x);
    minY = Math.min(minY, transformed.y);
    maxY = Math.max(maxY, transformed.y);
  }

  // Calculate approximate scale from the transform matrix to scale the bounding box
  const scaleX = Math.sqrt(transform.a * transform.a + transform.b * transform.b);
  const scaleY = Math.sqrt(transform.c * transform.c + transform.d * transform.d);
  
  const halfWidth = (boundingBoxWidth / 2) * scaleX;
  const halfHeight = (boundingBoxHeight / 2) * scaleY;

  const centerX = viewWidth / 2;
  const centerY = viewHeight / 2;

  return (
    maxX < centerX - halfWidth ||
    minX > centerX + halfWidth ||
    maxY < centerY - halfHeight ||
    minY > centerY + halfHeight
  );
}

/**
 * Pixi.js-based Shape class
 */
export class PixiShape {
  pts: Point[];
  quad: Quad;
  label: TileLabel;
  private graphics: PIXI.Graphics | null = null;

  constructor(pts: Point[], quad: Quad, label: TileLabel) {
    this.pts = pts;
    this.quad = quad;
    this.label = label;
  }

  /**
   * Create or update the graphics object for this shape
   */
  draw(
    container: PIXI.Container,
    currentTransform: PIXI.Matrix, // NEW: explicitly passed transform
    colmap: ColorMap,
    boundingBoxWidth: number,
    boundingBoxHeight: number,
    viewWidth: number,
    viewHeight: number,
    counters: { total: number; visible: number }
  ): void {
    // Use the explicitly passed transform for culling instead of container.worldTransform
    const isOutside = isTileOutsideBounds(
      this.pts,
      currentTransform,
      boundingBoxWidth,
      boundingBoxHeight,
      viewWidth,
      viewHeight
    );

    counters.total++;

    if (isOutside) {
      return;
    }

    counters.visible++;

    // Create graphics object if it doesn't exist
    if (!this.graphics) {
      this.graphics = new PIXI.Graphics();
    } else {
      this.graphics.clear();
    }

    const fillColor = colmap[this.label];
    const strokeColor: [number, number, number] = [0, 0, 0];

    // Convert RGB to hex
    const fillHex = (fillColor[0] << 16) | (fillColor[1] << 8) | fillColor[2];
    const strokeHex = (strokeColor[0] << 16) | (strokeColor[1] << 8) | strokeColor[2];

    // Pixi.js v8 API: set fill/stroke styles then draw path
    this.graphics.fill(fillHex);
    this.graphics.stroke({ width: 0.1, color: strokeHex });

    this.graphics.moveTo(this.pts[0].x, this.pts[0].y);
    for (let i = 1; i < this.pts.length; i++) {
      this.graphics.lineTo(this.pts[i].x, this.pts[i].y);
    }
    this.graphics.closePath();

    container.addChild(this.graphics);
  }

  streamSVG(S: TransformMatrix, stream: string[], colmap: ColorMap): void {
    let s = '<polygon points="';
    let at_start = true;
    for (const p of this.pts) {
      const sp = transPt(S, p);
      if (at_start) {
        at_start = false;
      } else {
        s = s + ' ';
      }
      s = s + `${sp.x},${sp.y}`;
    }
    const col = colmap[this.label];
    s = s + `" stroke="black" stroke-weight="0.1" fill="rgb(${col[0]},${col[1]},${col[2]})" />`;
    stream.push(s);
  }

  destroy(): void {
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
  }
}

/**
 * Pixi.js-based CurvyShape class
 */
export class PixiCurvyShape {
  pts: Point[];
  quad: Quad;
  label: TileLabel;
  private graphics: PIXI.Graphics | null = null;

  constructor(pts: Point[], quad: Quad, label: TileLabel) {
    this.quad = quad;
    this.label = label;
    let blah = true;
    this.pts = [pts[pts.length - 1]];
    for (const p of pts) {
      const prev = this.pts[this.pts.length - 1];
      const v = psub(p, prev);
      const w = pt(-v.y, v.x);
      if (blah) {
        this.pts.push(pframe(prev, v, w, 0.33, 0.6));
        this.pts.push(pframe(prev, v, w, 0.67, 0.6));
      } else {
        this.pts.push(pframe(prev, v, w, 0.33, -0.6));
        this.pts.push(pframe(prev, v, w, 0.67, -0.6));
      }
      blah = !blah;
      this.pts.push(p);
    }
  }

  draw(
    container: PIXI.Container,
    currentTransform: PIXI.Matrix, // NEW: explicitly passed transform
    colmap: ColorMap,
    boundingBoxWidth: number,
    boundingBoxHeight: number,
    viewWidth: number,
    viewHeight: number,
    counters: { total: number; visible: number }
  ): void {
    const isOutside = isTileOutsideBounds(
      this.pts,
      currentTransform,
      boundingBoxWidth,
      boundingBoxHeight,
      viewWidth,
      viewHeight
    );

    counters.total++;

    if (isOutside) {
      return;
    }

    counters.visible++;

    if (!this.graphics) {
      this.graphics = new PIXI.Graphics();
    } else {
      this.graphics.clear();
    }

    const fillColor = colmap[this.label];
    const strokeColor: [number, number, number] = [0, 0, 0];

    const fillHex = (fillColor[0] << 16) | (fillColor[1] << 8) | fillColor[2];
    const strokeHex = (strokeColor[0] << 16) | (strokeColor[1] << 8) | strokeColor[2];

    // Pixi.js v8 API: set fill/stroke styles then draw path
    this.graphics.fill(fillHex);
    this.graphics.stroke({ width: 0.1, color: strokeHex });

    this.graphics.moveTo(this.pts[0].x, this.pts[0].y);

    for (let idx = 1; idx < this.pts.length; idx += 3) {
      const a = this.pts[idx];
      const b = this.pts[idx + 1];
      const c = this.pts[idx + 2];
      this.graphics.bezierCurveTo(a.x, a.y, b.x, b.y, c.x, c.y);
    }
    this.graphics.closePath();

    container.addChild(this.graphics);
  }

  streamSVG(S: TransformMatrix, stream: string[], colmap: ColorMap): void {
    const tp = transPt(S, this.pts[0]);
    let s = `<path d="M ${tp.x} ${tp.y}`;
    for (let idx = 1; idx < this.pts.length; idx += 3) {
      const a = transPt(S, this.pts[idx]);
      const b = transPt(S, this.pts[idx + 1]);
      const c = transPt(S, this.pts[idx + 2]);
      s = s + ` C ${a.x} ${a.y} ${b.x} ${b.y} ${c.x} ${c.y}`;
    }
    const col = colmap[this.label];
    s = s + `" stroke="black" stroke-weight="0.1" fill="rgb(${col[0]},${col[1]},${col[2]})" />`;
    stream.push(s);
  }

  destroy(): void {
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
  }
}

/**
 * Pixi.js-based Meta class (container for multiple shapes)
 */
export class PixiMeta {
  geoms: Array<{ geom: PixiShape | PixiCurvyShape | PixiMeta; xform: TransformMatrix }>;
  quad: Point[];
  private container: PIXI.Container | null = null;

  constructor() {
    this.geoms = [];
    this.quad = [];
  }

  addChild(g: PixiShape | PixiCurvyShape | PixiMeta, T: TransformMatrix): void {
    this.geoms.push({ geom: g, xform: T });
  }

  draw(
    parentContainer: PIXI.Container,
    currentTransform: PIXI.Matrix, // NEW: explicitly passed transform
    colmap: ColorMap,
    boundingBoxWidth: number,
    boundingBoxHeight: number,
    viewWidth: number,
    viewHeight: number,
    counters: { total: number; visible: number }
  ): void {
    for (const g of this.geoms) {
      const childContainer = new PIXI.Container();
      
      const M = g.xform;
      // Local transform of this child
      const localMatrix = new PIXI.Matrix(M[0], M[3], M[1], M[4], M[2], M[5]);
      childContainer.setFromMatrix(localMatrix);
      
      parentContainer.addChild(childContainer);
      
      // Calculate the new world transform for the child by appending parent transform
      // Pixi matrix multiplication: childWorld = local * parentWorld
      // Matrix.append() does: this = this * other
      const nextTransform = localMatrix.clone().append(currentTransform);

      g.geom.draw(
        childContainer, 
        nextTransform, // Pass the calculated transform down
        colmap, 
        boundingBoxWidth, 
        boundingBoxHeight, 
        viewWidth, 
        viewHeight, 
        counters
      );
    }
  }

  streamSVG(S: TransformMatrix, stream: string[], colmap: ColorMap): void {
    for (const g of this.geoms) {
      g.geom.streamSVG(mul(S, g.xform), stream, colmap);
    }
  }

  destroy(): void {
    for (const g of this.geoms) {
      g.geom.destroy();
    }
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
  }
}
