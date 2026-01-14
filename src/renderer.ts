// renderer.ts - Canvas drawing and rendering logic

import { Point, Color } from './types';

/**
 * Check if a tile is fully outside the bounding box
 * Returns true if the tile should be invisible
 */
export function isTileOutsideBounds(
  pts: Point[],
  ctx: CanvasRenderingContext2D,
  boundingBoxWidth: number,
  boundingBoxHeight: number
): boolean {
  // Get the current transformation matrix from the context
  // This includes: center translation + tileScale + to_screen
  const transform = ctx.getTransform();

  // Calculate the bounding box of the tile in screen space
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  for (const p of pts) {
    // Transform the point to screen coordinates
    const x = transform.a * p.x + transform.c * p.y + transform.e;
    const y = transform.b * p.x + transform.d * p.y + transform.f;

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  // Get the scale factor from the transform
  const scaleX = Math.sqrt(transform.a * transform.a + transform.b * transform.b);
  const scaleY = Math.sqrt(transform.c * transform.c + transform.d * transform.d);

  // Convert bounding box dimensions to screen space
  // The bounding box is specified in tile units, so we scale by the transformation scale
  const halfWidth = (boundingBoxWidth / 2) * scaleX;
  const halfHeight = (boundingBoxHeight / 2) * scaleY;

  // Tile is outside if its bounding box doesn't overlap with the viewing box
  return maxX < -halfWidth || minX > halfWidth || maxY < -halfHeight || minY > halfHeight;
}

/**
 * Draw a polygon on the canvas
 */
export function drawPolygon(
  ctx: CanvasRenderingContext2D,
  shape: Point[],
  fillColor: Color | null,
  strokeColor: Color | null,
  strokeWidth: number
): void {
  ctx.beginPath();
  ctx.moveTo(shape[0].x, shape[0].y);
  for (let i = 1; i < shape.length; i++) {
    ctx.lineTo(shape[i].x, shape[i].y);
  }
  ctx.closePath();

  if (fillColor != null) {
    ctx.fillStyle = `rgb(${fillColor[0]},${fillColor[1]},${fillColor[2]})`;
    ctx.fill();
  }
  if (strokeColor != null) {
    ctx.strokeStyle = `rgb(${strokeColor[0]},${strokeColor[1]},${strokeColor[2]})`;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}
