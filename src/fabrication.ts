/**
 * Fabrication utilities for manufacturing Spectre tiles
 * 
 * This module provides robust polygon offsetting and DXF export functionality
 * using industry-standard libraries:
 * - js-angusj-clipper: For polygon boolean operations and offsetting
 * - dxf-writer: For standards-compliant DXF file generation
 */

import * as clipperLib from 'js-angusj-clipper';
import DxfWriter from 'dxf-writer';
import { Point } from './types';

// Clipper library instance (lazy-loaded)
let clipperInstance: clipperLib.ClipperLibWrapper | null = null;

/**
 * Initialize the clipper library (should be called once at startup)
 */
export async function initializeClipper(): Promise<void> {
  if (!clipperInstance) {
    clipperInstance = await clipperLib.loadNativeClipperLibInstanceAsync(
      clipperLib.NativeClipperLibRequestedFormat.WasmWithAsmJsFallback
    );
  }
}

/**
 * Get the clipper instance (initializes if needed)
 */
async function getClipper(): Promise<clipperLib.ClipperLibWrapper> {
  if (!clipperInstance) {
    await initializeClipper();
  }
  return clipperInstance!;
}

/**
 * Offset a polygon by a given distance using robust clipper library.
 * 
 * This replaces the manual offsetPolygon implementation with a robust
 * solution that handles complex non-convex shapes, self-intersections,
 * and artifacts correctly.
 * 
 * @param points - Array of points defining the polygon
 * @param delta - Offset distance (positive = outward, negative = inward)
 * @param scaleFactor - Scale factor for integer conversion (default: 1000)
 * @returns Offset polygon points, or original points if offset fails
 */
export async function offsetPolygon(
  points: Point[],
  delta: number,
  scaleFactor: number = 1000
): Promise<Point[]> {
  const clipper = await getClipper();

  // Convert points to integer coordinates for clipper
  // Clipper requires integer coordinates, so we scale up by scaleFactor
  const scaledPoints = points.map(p => ({
    x: Math.round(p.x * scaleFactor),
    y: Math.round(p.y * scaleFactor)
  }));

  const scaledDelta = delta * scaleFactor;

  try {
    // Perform the offset operation
    const result = clipper.offsetToPaths({
      delta: scaledDelta,
      offsetInputs: [{
        data: scaledPoints,
        joinType: clipperLib.JoinType.Miter,
        endType: clipperLib.EndType.ClosedPolygon
      }],
      miterLimit: 2.0  // Prevents excessive spikes at acute angles
    });

    // If offset succeeded and returned at least one path
    if (result && result.length > 0 && result[0].length > 0) {
      // Scale back to original coordinate system
      return result[0].map(p => ({
        x: p.x / scaleFactor,
        y: p.y / scaleFactor
      }));
    }

    // If offset failed, return original points
    console.warn('Polygon offset produced no results, returning original polygon');
    return points;
  } catch (error) {
    console.error('Error during polygon offset:', error);
    return points;
  }
}

/**
 * Export shapes to DXF format using dxf-writer library.
 * 
 * This replaces manual DXF string generation with a standards-compliant
 * library that handles units and format correctly.
 * 
 * @param shapes - Array of shapes (each shape is an array of points)
 * @param options - Export options
 * @returns DXF file content as string
 */
export function exportToDXF(
  shapes: Point[][],
  options: {
    stockWidth?: number;
    stockHeight?: number;
    includeStock?: boolean;
    units?: 'Inches' | 'Millimeters';
  } = {}
): string {
  const {
    stockWidth,
    stockHeight,
    includeStock = false,
    units = 'Inches'
  } = options;

  const drawing = new DxfWriter();
  
  // Set units (properly handled by dxf-writer)
  drawing.setUnits(units);

  // Add layers
  if (includeStock && stockWidth && stockHeight) {
    drawing.addLayer('STOCK', DxfWriter.ACI.WHITE, 'CONTINUOUS');
  }
  drawing.addLayer('CUT_PATH', DxfWriter.ACI.RED, 'CONTINUOUS');

  // Draw stock rectangle if requested
  if (includeStock && stockWidth && stockHeight) {
    drawing.setActiveLayer('STOCK');
    const stockPoints: [number, number][] = [
      [0, 0],
      [stockWidth, 0],
      [stockWidth, stockHeight],
      [0, stockHeight]
    ];
    drawing.drawPolyline(stockPoints, true); // true = closed
  }

  // Draw cut paths
  drawing.setActiveLayer('CUT_PATH');
  
  for (const shape of shapes) {
    // Convert points to [x, y] tuples
    const polylinePoints: [number, number][] = shape.map(p => [p.x, p.y]);
    
    // Detect if this is a bridge (2 points) or a tile (many points)
    const isClosed = shape.length > 2;
    
    drawing.drawPolyline(polylinePoints, isClosed);
  }

  // Generate and return DXF string
  return drawing.toDxfString();
}

/**
 * Download a string as a file in the browser
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'application/dxf'): void {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Export fabrication DXF with stock and cut paths
 */
export function exportFabricationDXF(
  shapes: Point[][],
  stockWidth: number,
  stockHeight: number,
  units: 'Inches' | 'Millimeters' = 'Inches'
): void {
  const dxfContent = exportToDXF(shapes, {
    stockWidth,
    stockHeight,
    includeStock: true,
    units
  });
  
  downloadFile(dxfContent, 'spectre_fabrication.dxf', 'application/dxf');
}

/**
 * Export optimized cut paths DXF (without stock)
 */
export function exportOptimizedDXF(
  shapes: Point[][],
  units: 'Inches' | 'Millimeters' = 'Inches'
): void {
  const dxfContent = exportToDXF(shapes, {
    includeStock: false,
    units
  });
  
  downloadFile(dxfContent, 'spectre_cut_optimized.dxf', 'application/dxf');
}
