/**
 * Unit tests for fabrication/manufacturing features
 * Tests polygon offsetting and DXF export functionality
 */

// Load the clipper library for testing
const clipperLib = require('js-angusj-clipper');
const DxfWriter = require('dxf-writer');

describe('Fabrication features', () => {
  let clipper;

  beforeAll(async () => {
    // Initialize the clipper library
    clipper = await clipperLib.loadNativeClipperLibInstanceAsync(
      clipperLib.NativeClipperLibRequestedFormat.WasmWithAsmJsFallback
    );
  });

  describe('Polygon offsetting with js-angusj-clipper', () => {
    test('should offset a square polygon inward', () => {
      // Create a simple square
      const square = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 }
      ];

      // Offset inward by 10 units (negative delta shrinks)
      const result = clipper.offsetToPaths({
        delta: -10,
        offsetInputs: [{
          data: square,
          joinType: clipperLib.JoinType.Miter,
          endType: clipperLib.EndType.ClosedPolygon
        }]
      });

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].length).toBe(4); // Still a square
      
      // Check that points moved inward (approximately)
      expect(result[0][0].x).toBeGreaterThan(5);
      expect(result[0][0].y).toBeGreaterThan(5);
    });

    test('should offset a square polygon outward', () => {
      const square = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 }
      ];

      // Offset outward by 10 units (positive delta expands)
      const result = clipper.offsetToPaths({
        delta: 10,
        offsetInputs: [{
          data: square,
          joinType: clipperLib.JoinType.Miter,
          endType: clipperLib.EndType.ClosedPolygon
        }]
      });

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].length).toBe(4);
      
      // The polygon should be larger - check bounding box expanded
      const minX = Math.min(...result[0].map(p => p.x));
      const maxX = Math.max(...result[0].map(p => p.x));
      const minY = Math.min(...result[0].map(p => p.y));
      const maxY = Math.max(...result[0].map(p => p.y));
      
      // Original was 0-100, expanded should be larger
      expect(maxX - minX).toBeGreaterThan(100);
      expect(maxY - minY).toBeGreaterThan(100);
    });

    test('should handle complex polygon (Spectre tile shape)', () => {
      // Simplified Spectre-like polygon
      const spectre = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 150, y: -86 },
        { x: 236, y: -36 },
        { x: 236, y: 63 },
        { x: 163, y: 236 },
        { x: 63, y: 236 },
        { x: -36, y: 236 },
        { x: -86, y: 150 },
        { x: 0, y: 100 }
      ];

      const result = clipper.offsetToPaths({
        delta: -5,
        offsetInputs: [{
          data: spectre,
          joinType: clipperLib.JoinType.Miter,
          endType: clipperLib.EndType.ClosedPolygon
        }]
      });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      // The result should still be a closed polygon
      if (result[0]) {
        expect(result[0].length).toBeGreaterThan(2);
      }
    });
  });

  describe('DXF export with dxf-writer', () => {
    test('should create a DXF drawing with polylines', () => {
      const drawing = new DxfWriter();
      
      // Set units to inches (for fabrication)
      drawing.setUnits('Inches');
      
      // Add a layer for cut paths
      drawing.addLayer('CUT_PATH', DxfWriter.ACI.RED, 'CONTINUOUS');
      drawing.setActiveLayer('CUT_PATH');
      
      // Draw a simple closed polyline (tile)
      const points = [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10]
      ];
      drawing.drawPolyline(points, true); // true = closed
      
      // Generate DXF string
      const dxfString = drawing.toDxfString();
      
      expect(dxfString).toBeDefined();
      expect(typeof dxfString).toBe('string');
      expect(dxfString.length).toBeGreaterThan(0);
      
      // Check for essential DXF elements
      expect(dxfString).toContain('SECTION');
      expect(dxfString).toContain('ENTITIES');
      expect(dxfString).toContain('POLYLINE');
      expect(dxfString).toContain('CUT_PATH');
      expect(dxfString).toContain('EOF');
    });

    test('should support multiple layers', () => {
      const drawing = new DxfWriter();
      drawing.setUnits('Inches');
      
      // Stock layer
      drawing.addLayer('STOCK', DxfWriter.ACI.WHITE, 'CONTINUOUS');
      drawing.setActiveLayer('STOCK');
      drawing.drawPolyline([[0, 0], [24, 0], [24, 24], [0, 24]], true);
      
      // Cut path layer
      drawing.addLayer('CUT_PATH', DxfWriter.ACI.RED, 'CONTINUOUS');
      drawing.setActiveLayer('CUT_PATH');
      drawing.drawPolyline([[1, 1], [5, 1], [5, 5], [1, 5]], true);
      
      const dxfString = drawing.toDxfString();
      
      expect(dxfString).toContain('STOCK');
      expect(dxfString).toContain('CUT_PATH');
    });

    test('should handle open polylines (bridges)', () => {
      const drawing = new DxfWriter();
      drawing.setUnits('Inches');
      
      drawing.addLayer('BRIDGE', DxfWriter.ACI.CYAN, 'CONTINUOUS');
      drawing.setActiveLayer('BRIDGE');
      
      // Open polyline (bridge between tiles)
      const bridgePoints = [[5, 5], [6, 6]];
      drawing.drawPolyline(bridgePoints, false); // false = open
      
      const dxfString = drawing.toDxfString();
      
      expect(dxfString).toContain('POLYLINE');
      expect(dxfString).toContain('BRIDGE');
    });
  });

  describe('Integration - offset and export', () => {
    test('should offset polygon and export to DXF', () => {
      // Offset a square
      const square = [
        { x: 0, y: 0 },
        { x: 1000, y: 0 },
        { x: 1000, y: 1000 },
        { x: 0, y: 1000 }
      ];

      const offsetResult = clipper.offsetToPaths({
        delta: -100, // Shrink by 100 units
        offsetInputs: [{
          data: square,
          joinType: clipperLib.JoinType.Miter,
          endType: clipperLib.EndType.ClosedPolygon
        }]
      });

      expect(offsetResult).toBeDefined();
      expect(offsetResult.length).toBe(1);

      // Convert to DXF
      const drawing = new DxfWriter();
      drawing.setUnits('Inches');
      drawing.addLayer('CUT', DxfWriter.ACI.RED, 'CONTINUOUS');
      drawing.setActiveLayer('CUT');

      // Scale coordinates back to inches (assuming 100 units = 1 inch)
      const scaleFactor = 100;
      const scaledPoints = offsetResult[0].map(p => [
        p.x / scaleFactor,
        p.y / scaleFactor
      ]);

      drawing.drawPolyline(scaledPoints, true);

      const dxfString = drawing.toDxfString();
      
      expect(dxfString).toBeDefined();
      expect(dxfString).toContain('POLYLINE');
      expect(dxfString).toContain('CUT');
    });
  });
});
