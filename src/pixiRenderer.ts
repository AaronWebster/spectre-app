// pixiRenderer.ts - Pixi.js-based renderer for improved performance

import * as PIXI from 'pixi.js';
import { Point, Color, ColorMap, TransformMatrix } from './types';

/**
 * Pixi.js Graphics Pool for reusing graphics objects
 */
class GraphicsPool {
  private pool: PIXI.Graphics[] = [];
  private inUse = new Set<PIXI.Graphics>();

  acquire(): PIXI.Graphics {
    let graphics: PIXI.Graphics;
    if (this.pool.length > 0) {
      graphics = this.pool.pop()!;
    } else {
      graphics = new PIXI.Graphics();
    }
    this.inUse.add(graphics);
    return graphics;
  }

  release(graphics: PIXI.Graphics): void {
    if (this.inUse.has(graphics)) {
      graphics.clear();
      this.inUse.delete(graphics);
      this.pool.push(graphics);
    }
  }

  releaseAll(): void {
    this.inUse.forEach((graphics) => {
      graphics.clear();
      this.pool.push(graphics);
    });
    this.inUse.clear();
  }
}

/**
 * Pixi.js-based renderer
 */
export class PixiRenderer {
  private app: PIXI.Application;
  private mainContainer: PIXI.Container;
  private graphicsPool: GraphicsPool;
  private tileCount = 0;
  private visibleTileCount = 0;

  constructor(width: number, height: number, canvas: HTMLCanvasElement) {
    // Initialize Pixi.js Application with High DPI support
    this.app = new PIXI.Application();
    
    // Initialize the app asynchronously
    this.initApp(width, height, canvas);
    
    this.mainContainer = new PIXI.Container();
    this.graphicsPool = new GraphicsPool();
  }

  private async initApp(width: number, height: number, canvas: HTMLCanvasElement) {
    await this.app.init({
      canvas: canvas,
      width: width,
      height: height,
      backgroundColor: 0xffffff,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: true,
    });
    
    this.app.stage.addChild(this.mainContainer);
  }

  /**
   * Resize the renderer
   */
  resize(width: number, height: number): void {
    this.app.renderer.resize(width, height);
  }

  /**
   * Clear all rendered tiles
   */
  clear(): void {
    this.mainContainer.removeChildren();
    this.graphicsPool.releaseAll();
    this.tileCount = 0;
    this.visibleTileCount = 0;
  }

  /**
   * Get tile counts
   */
  getTileCounts(): { total: number; visible: number } {
    return { total: this.tileCount, visible: this.visibleTileCount };
  }

  /**
   * Reset tile counters
   */
  resetTileCounts(): void {
    this.tileCount = 0;
    this.visibleTileCount = 0;
  }

  /**
   * Increment tile counter
   */
  incrementTileCount(): void {
    this.tileCount++;
  }

  /**
   * Increment visible tile counter
   */
  incrementVisibleTileCount(): void {
    this.visibleTileCount++;
  }

  /**
   * Apply transform to the main container
   */
  setTransform(transform: TransformMatrix, centerX: number, centerY: number, tileScale: number): void {
    // Reset container position to center
    this.mainContainer.position.set(centerX, centerY);
    
    // Apply tile scale
    this.mainContainer.scale.set(tileScale, tileScale);
    
    // Apply the to_screen transform as a matrix
    // TransformMatrix is [a, b, tx, c, d, ty]
    // Pixi Matrix is [a, b, c, d, tx, ty]
    const matrix = new PIXI.Matrix(
      transform[0],  // a
      transform[3],  // b (swap)
      transform[1],  // c (swap)
      transform[4],  // d
      transform[2],  // tx
      transform[5]   // ty
    );
    
    // We need to apply this transform in addition to the position and scale
    // Create a temporary container for the transform
    const tempMatrix = this.mainContainer.localTransform.clone();
    tempMatrix.append(matrix);
    
    // Apply the combined transform
    this.mainContainer.setFromMatrix(tempMatrix);
  }

  /**
   * Draw a polygon
   */
  drawPolygon(
    points: Point[],
    fillColor: Color | null,
    strokeColor: Color | null,
    strokeWidth: number,
    transform?: TransformMatrix
  ): PIXI.Graphics {
    const graphics = this.graphicsPool.acquire();

    if (fillColor) {
      const color = (fillColor[0] << 16) | (fillColor[1] << 8) | fillColor[2];
      graphics.fill(color);
    }

    if (strokeColor) {
      const color = (strokeColor[0] << 16) | (strokeColor[1] << 8) | strokeColor[2];
      graphics.stroke({ width: strokeWidth, color: color });
    }

    // Draw the polygon
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(points[i].x, points[i].y);
    }
    graphics.closePath();

    // Apply transform if provided
    if (transform) {
      const matrix = new PIXI.Matrix(
        transform[0],
        transform[3],
        transform[1],
        transform[4],
        transform[2],
        transform[5]
      );
      graphics.setFromMatrix(matrix);
    }

    this.mainContainer.addChild(graphics);
    return graphics;
  }

  /**
   * Draw a curvy shape with bezier curves
   */
  drawCurvyShape(
    points: Point[],
    fillColor: Color,
    strokeColor: Color,
    strokeWidth: number
  ): PIXI.Graphics {
    const graphics = this.graphicsPool.acquire();

    const color = (fillColor[0] << 16) | (fillColor[1] << 8) | fillColor[2];
    graphics.fill(color);

    const sColor = (strokeColor[0] << 16) | (strokeColor[1] << 8) | strokeColor[2];
    graphics.stroke({ width: strokeWidth, color: sColor });

    graphics.moveTo(points[0].x, points[0].y);

    for (let idx = 1; idx < points.length; idx += 3) {
      const a = points[idx];
      const b = points[idx + 1];
      const c = points[idx + 2];
      graphics.bezierCurveTo(a.x, a.y, b.x, b.y, c.x, c.y);
    }
    graphics.closePath();

    this.mainContainer.addChild(graphics);
    return graphics;
  }

  /**
   * Check if a tile is outside the viewport bounds
   */
  isTileOutsideBounds(
    pts: Point[],
    transform: TransformMatrix,
    boundingBoxWidth: number,
    boundingBoxHeight: number,
    centerX: number,
    centerY: number,
    tileScale: number
  ): boolean {
    // Calculate the bounding box of the tile in screen space
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;

    for (const p of pts) {
      // Apply transformation: x' = ax + by + tx, y' = cx + dy + ty
      const x = transform[0] * p.x + transform[1] * p.y + transform[2];
      const y = transform[3] * p.x + transform[4] * p.y + transform[5];

      // Scale and translate to screen
      const screenX = x * tileScale + centerX;
      const screenY = y * tileScale + centerY;

      minX = Math.min(minX, screenX);
      maxX = Math.max(maxX, screenX);
      minY = Math.min(minY, screenY);
      maxY = Math.max(maxY, screenY);
    }

    // Get the scale factor
    const scaleX = Math.sqrt(transform[0] * transform[0] + transform[3] * transform[3]) * tileScale;
    const scaleY = Math.sqrt(transform[1] * transform[1] + transform[4] * transform[4]) * tileScale;

    // Convert bounding box dimensions to screen space
    const halfWidth = (boundingBoxWidth / 2) * scaleX;
    const halfHeight = (boundingBoxHeight / 2) * scaleY;

    // Tile is outside if its bounding box doesn't overlap with the viewing box
    const isOutside =
      maxX < centerX - halfWidth ||
      minX > centerX + halfWidth ||
      maxY < centerY - halfHeight ||
      minY > centerY + halfHeight;

    return isOutside;
  }

  /**
   * Render the scene
   */
  render(): void {
    // Pixi.js handles rendering automatically via requestAnimationFrame
    // This method is here for compatibility but Pixi renders on its own
  }

  /**
   * Get the Pixi application
   */
  getApp(): PIXI.Application {
    return this.app;
  }

  /**
   * Destroy the renderer
   */
  destroy(): void {
    this.app.destroy(true);
  }
}
