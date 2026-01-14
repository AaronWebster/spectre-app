// shapes.ts - Shape classes (Shape, CurvyShape, Meta)

import { Point, Quad, TileLabel, ColorMap, TransformMatrix } from './types';
import { psub, pt, pframe, transPt, mul } from './math';
import { isTileOutsideBounds, drawPolygon } from './renderer';

// Global state for counters (these will be managed by the main app)
export let tileCount = 0;
export let visibleTileCount = 0;

export function resetTileCounts(): void {
  tileCount = 0;
  visibleTileCount = 0;
}

export function incrementTileCount(): void {
  tileCount++;
}

export function incrementVisibleTileCount(): void {
  visibleTileCount++;
}

export function getTileCounts(): { total: number; visible: number } {
  return { total: tileCount, visible: visibleTileCount };
}

/**
 * Basic shape class for rendering polygons
 */
export class Shape {
  pts: Point[];
  quad: Quad;
  label: TileLabel;

  constructor(pts: Point[], quad: Quad, label: TileLabel) {
    this.pts = pts;
    this.quad = quad;
    this.label = label;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    colmap: ColorMap,
    boundingBoxWidth: number,
    boundingBoxHeight: number,
    isExporting?: boolean,
    exportedShapes?: Point[][]
  ): void {
    const isOutside = isTileOutsideBounds(this.pts, ctx, boundingBoxWidth, boundingBoxHeight);

    if (isExporting) {
      // In Export mode, we ignore bounds (or keep them if you want only visible)
      // We must extract the absolute coordinates.
      if (!isOutside && exportedShapes) {
        const t = ctx.getTransform();
        const worldPts = this.pts.map((p) => {
          return {
            x: t.a * p.x + t.c * p.y + t.e,
            y: t.b * p.x + t.d * p.y + t.f
          };
        });
        exportedShapes.push(worldPts);
      }
      tileCount++;
      return;
    }

    if (!isOutside) {
      drawPolygon(ctx, this.pts, colmap[this.label], [0, 0, 0], 0.1);
      visibleTileCount++;
    }
    tileCount++;
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
}

/**
 * Curvy shape class for rendering shapes with bezier curves
 */
export class CurvyShape {
  pts: Point[];
  quad: Quad;
  label: TileLabel;

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
    ctx: CanvasRenderingContext2D,
    colmap: ColorMap,
    boundingBoxWidth: number,
    boundingBoxHeight: number
  ): void {
    const isOutside = isTileOutsideBounds(this.pts, ctx, boundingBoxWidth, boundingBoxHeight);
    if (!isOutside) {
      // Only draw if tile is inside bounds
      const col = colmap[this.label];
      ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
      ctx.strokeStyle = 'rgb(0,0,0)';
      ctx.lineWidth = 0.1;

      ctx.beginPath();
      ctx.moveTo(this.pts[0].x, this.pts[0].y);

      for (let idx = 1; idx < this.pts.length; idx += 3) {
        const a = this.pts[idx];
        const b = this.pts[idx + 1];
        const c = this.pts[idx + 2];
        ctx.bezierCurveTo(a.x, a.y, b.x, b.y, c.x, c.y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      visibleTileCount++;
    }
    // Always count the tile even if not visible
    tileCount++;
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
}

/**
 * Meta shape that contains multiple child shapes with transformations
 */
export class Meta {
  geoms: Array<{ geom: Shape | CurvyShape | Meta; xform: TransformMatrix }>;
  quad: Point[];

  constructor() {
    this.geoms = [];
    this.quad = [];
  }

  addChild(g: Shape | CurvyShape | Meta, T: TransformMatrix): void {
    this.geoms.push({ geom: g, xform: T });
  }

  draw(ctx: CanvasRenderingContext2D, colmap: ColorMap, boundingBoxWidth: number, boundingBoxHeight: number): void {
    for (const g of this.geoms) {
      ctx.save();
      const M = g.xform;
      ctx.transform(M[0], M[3], M[1], M[4], M[2], M[5]);
      g.geom.draw(ctx, colmap, boundingBoxWidth, boundingBoxHeight);
      ctx.restore();
    }
  }

  streamSVG(S: TransformMatrix, stream: string[], colmap: ColorMap): void {
    for (const g of this.geoms) {
      g.geom.streamSVG(mul(S, g.xform), stream, colmap);
    }
  }
}
