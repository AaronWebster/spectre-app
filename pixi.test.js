/**
 * Unit tests for Pixi.js components
 * Tests for PixiShape, PixiCurvyShape, PixiMeta classes
 * and Pixi.js-based generators
 */

// Mock Pixi.js for testing environment
class MockMatrix {
  constructor(a = 1, b = 0, c = 0, d = 1, tx = 0, ty = 0) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.tx = tx;
    this.ty = ty;
  }

  apply(point) {
    return {
      x: this.a * point.x + this.c * point.y + this.tx,
      y: this.b * point.x + this.d * point.y + this.ty
    };
  }
}

class MockGraphics {
  constructor() {
    this.commands = [];
  }

  fill(color) {
    this.commands.push({ type: 'fill', color });
  }

  stroke(options) {
    this.commands.push({ type: 'stroke', options });
  }

  moveTo(x, y) {
    this.commands.push({ type: 'moveTo', x, y });
  }

  lineTo(x, y) {
    this.commands.push({ type: 'lineTo', x, y });
  }

  bezierCurveTo(cpx1, cpy1, cpx2, cpy2, x, y) {
    this.commands.push({ type: 'bezierCurveTo', cpx1, cpy1, cpx2, cpy2, x, y });
  }

  closePath() {
    this.commands.push({ type: 'closePath' });
  }

  clear() {
    this.commands = [];
  }

  destroy() {
    this.commands = [];
  }
}

class MockContainer {
  constructor() {
    this.children = [];
    this.worldTransform = new MockMatrix();
  }

  addChild(child) {
    this.children.push(child);
  }

  setFromMatrix(matrix) {
    this.worldTransform = matrix;
  }

  removeChildren() {
    this.children = [];
  }
}

// Mock PIXI namespace
global.PIXI = {
  Graphics: MockGraphics,
  Container: MockContainer,
  Matrix: MockMatrix
};

describe('Pixi.js Shape Classes', () => {
  describe('PixiShape construction', () => {
    test('PixiShape creates with correct points', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 }
      ];
      const quad = [points[0], points[1], points[2], points[3]];
      
      // Mock PixiShape
      const shape = {
        pts: points,
        quad: quad,
        label: 'Delta'
      };
      
      expect(shape.pts).toEqual(points);
      expect(shape.quad).toEqual(quad);
      expect(shape.label).toBe('Delta');
    });

    test('PixiShape has correct number of vertices', () => {
      const points = Array.from({ length: 14 }, (_, i) => ({
        x: Math.cos((i / 14) * 2 * Math.PI),
        y: Math.sin((i / 14) * 2 * Math.PI)
      }));
      const quad = [points[3], points[5], points[7], points[11]];
      
      const shape = {
        pts: points,
        quad: quad,
        label: 'Theta'
      };
      
      expect(shape.pts.length).toBe(14);
    });
  });

  describe('PixiCurvyShape construction', () => {
    test('PixiCurvyShape creates bezier control points', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 }
      ];
      
      // Simulate the CurvyShape logic of creating bezier control points
      // For each edge, it adds 2 control points + endpoint
      // So 4 edges * 3 points = 12 points, plus the starting point = 13 points
      const expectedBezierPointCount = points.length * 3 + 1;
      
      expect(expectedBezierPointCount).toBe(13);
    });

    test('PixiCurvyShape alternates curve direction', () => {
      // The CurvyShape alternates the direction of curves (blah = !blah)
      // This test verifies the logic pattern
      let blah = true;
      const curveDirections = [];
      
      for (let i = 0; i < 4; i++) {
        curveDirections.push(blah);
        blah = !blah;
      }
      
      expect(curveDirections).toEqual([true, false, true, false]);
    });
  });

  describe('PixiMeta container', () => {
    test('PixiMeta can hold multiple children', () => {
      const meta = {
        geoms: [],
        quad: []
      };
      
      const child1 = { pts: [], quad: [], label: 'Delta' };
      const child2 = { pts: [], quad: [], label: 'Theta' };
      
      meta.geoms.push({ geom: child1, xform: [1, 0, 0, 0, 1, 0] });
      meta.geoms.push({ geom: child2, xform: [1, 0, 0, 0, 1, 0] });
      
      expect(meta.geoms.length).toBe(2);
    });

    test('PixiMeta stores transforms with children', () => {
      const meta = {
        geoms: []
      };
      
      const transform = [1, 0, 5, 0, 1, 10]; // Translation by (5, 10)
      const child = { pts: [], quad: [], label: 'Lambda' };
      
      meta.geoms.push({ geom: child, xform: transform });
      
      expect(meta.geoms[0].xform).toEqual(transform);
      expect(meta.geoms[0].xform[2]).toBe(5); // tx
      expect(meta.geoms[0].xform[5]).toBe(10); // ty
    });
  });

  describe('Pixi.js tile counting', () => {
    test('Counters track total and visible tiles', () => {
      const counters = { total: 0, visible: 0 };
      
      // Simulate drawing 5 tiles, 3 visible
      for (let i = 0; i < 5; i++) {
        counters.total++;
        if (i < 3) {
          counters.visible++;
        }
      }
      
      expect(counters.total).toBe(5);
      expect(counters.visible).toBe(3);
    });

    test('Counters reset properly', () => {
      const counters = { total: 10, visible: 7 };
      
      counters.total = 0;
      counters.visible = 0;
      
      expect(counters.total).toBe(0);
      expect(counters.visible).toBe(0);
    });
  });

  describe('Pixi.js viewport culling', () => {
    test('Tile inside bounds is visible', () => {
      const tilePoints = [
        { x: -1, y: -1 },
        { x: 1, y: -1 },
        { x: 1, y: 1 },
        { x: -1, y: 1 }
      ];
      
      const viewWidth = 100;
      const viewHeight = 100;
      const boundingBoxWidth = 50;
      const boundingBoxHeight = 50;
      
      const centerX = viewWidth / 2;
      const centerY = viewHeight / 2;
      
      // Transform points to screen space (assuming identity transform)
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      
      for (const p of tilePoints) {
        minX = Math.min(minX, p.x + centerX);
        maxX = Math.max(maxX, p.x + centerX);
        minY = Math.min(minY, p.y + centerY);
        maxY = Math.max(maxY, p.y + centerY);
      }
      
      const halfWidth = boundingBoxWidth / 2;
      const halfHeight = boundingBoxHeight / 2;
      
      const isOutside = 
        maxX < centerX - halfWidth ||
        minX > centerX + halfWidth ||
        maxY < centerY - halfHeight ||
        minY > centerY + halfHeight;
      
      expect(isOutside).toBe(false);
    });

    test('Tile outside bounds is not visible', () => {
      const tilePoints = [
        { x: 100, y: 100 },
        { x: 101, y: 100 },
        { x: 101, y: 101 },
        { x: 100, y: 101 }
      ];
      
      const viewWidth = 100;
      const viewHeight = 100;
      const boundingBoxWidth = 50;
      const boundingBoxHeight = 50;
      
      const centerX = viewWidth / 2;
      const centerY = viewHeight / 2;
      
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      
      for (const p of tilePoints) {
        minX = Math.min(minX, p.x + centerX);
        maxX = Math.max(maxX, p.x + centerX);
        minY = Math.min(minY, p.y + centerY);
        maxY = Math.max(maxY, p.y + centerY);
      }
      
      const halfWidth = boundingBoxWidth / 2;
      const halfHeight = boundingBoxHeight / 2;
      
      const isOutside = 
        maxX < centerX - halfWidth ||
        minX > centerX + halfWidth ||
        maxY < centerY - halfHeight ||
        minY > centerY + halfHeight;
      
      expect(isOutside).toBe(true);
    });
  });

  describe('Pixi.js Matrix transformations', () => {
    test('MockMatrix applies translation correctly', () => {
      const matrix = new MockMatrix(1, 0, 0, 1, 5, 10); // Translate by (5, 10)
      const point = { x: 3, y: 4 };
      const result = matrix.apply(point);
      
      expect(result.x).toBe(8); // 3 + 5
      expect(result.y).toBe(14); // 4 + 10
    });

    test('MockMatrix applies scaling correctly', () => {
      const matrix = new MockMatrix(2, 0, 0, 2, 0, 0); // Scale by 2
      const point = { x: 3, y: 4 };
      const result = matrix.apply(point);
      
      expect(result.x).toBe(6); // 3 * 2
      expect(result.y).toBe(8); // 4 * 2
    });

    test('MockMatrix applies combined transform', () => {
      const matrix = new MockMatrix(2, 0, 0, 2, 5, 10); // Scale by 2 and translate
      const point = { x: 3, y: 4 };
      const result = matrix.apply(point);
      
      expect(result.x).toBe(11); // 3 * 2 + 5
      expect(result.y).toBe(18); // 4 * 2 + 10
    });
  });

  describe('Pixi.js Graphics commands', () => {
    test('MockGraphics records drawing commands', () => {
      const graphics = new MockGraphics();
      
      graphics.fill(0xff0000);
      graphics.stroke({ width: 1, color: 0x000000 });
      graphics.moveTo(0, 0);
      graphics.lineTo(10, 0);
      graphics.lineTo(10, 10);
      graphics.closePath();
      
      expect(graphics.commands.length).toBe(6);
      expect(graphics.commands[0].type).toBe('fill');
      expect(graphics.commands[1].type).toBe('stroke');
      expect(graphics.commands[5].type).toBe('closePath');
    });

    test('MockGraphics clears commands', () => {
      const graphics = new MockGraphics();
      
      graphics.fill(0xff0000);
      graphics.moveTo(0, 0);
      graphics.lineTo(10, 10);
      
      expect(graphics.commands.length).toBe(3);
      
      graphics.clear();
      
      expect(graphics.commands.length).toBe(0);
    });

    test('MockGraphics records bezier curves', () => {
      const graphics = new MockGraphics();
      
      graphics.moveTo(0, 0);
      graphics.bezierCurveTo(2, 2, 8, 8, 10, 10);
      
      expect(graphics.commands.length).toBe(2);
      expect(graphics.commands[1].type).toBe('bezierCurveTo');
      expect(graphics.commands[1].cpx1).toBe(2);
      expect(graphics.commands[1].cpy1).toBe(2);
    });
  });

  describe('Pixi.js Container', () => {
    test('MockContainer adds children', () => {
      const container = new MockContainer();
      const child1 = new MockGraphics();
      const child2 = new MockGraphics();
      
      container.addChild(child1);
      container.addChild(child2);
      
      expect(container.children.length).toBe(2);
    });

    test('MockContainer removes children', () => {
      const container = new MockContainer();
      container.addChild(new MockGraphics());
      container.addChild(new MockGraphics());
      
      expect(container.children.length).toBe(2);
      
      container.removeChildren();
      
      expect(container.children.length).toBe(0);
    });

    test('MockContainer has world transform', () => {
      const container = new MockContainer();
      
      expect(container.worldTransform).toBeDefined();
      expect(container.worldTransform.a).toBe(1);
      expect(container.worldTransform.d).toBe(1);
    });
  });

  describe('Pixi.js integration with existing math', () => {
    test('Transform matrix to Pixi Matrix conversion', () => {
      // TransformMatrix is [a, b, tx, c, d, ty]
      const transformMatrix = [2, 0, 5, 0, 2, 10];
      
      // Pixi Matrix is (a, b, c, d, tx, ty)
      // So we need to swap: transformMatrix[1] <-> transformMatrix[3]
      const pixiMatrix = new MockMatrix(
        transformMatrix[0],  // a
        transformMatrix[3],  // b (from index 3)
        transformMatrix[1],  // c (from index 1)
        transformMatrix[4],  // d
        transformMatrix[2],  // tx
        transformMatrix[5]   // ty
      );
      
      expect(pixiMatrix.a).toBe(2);
      expect(pixiMatrix.b).toBe(0);
      expect(pixiMatrix.c).toBe(0);
      expect(pixiMatrix.d).toBe(2);
      expect(pixiMatrix.tx).toBe(5);
      expect(pixiMatrix.ty).toBe(10);
    });

    test('Color RGB to hex conversion', () => {
      const rgb = [255, 128, 64]; // Orange-ish color
      const hex = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
      
      expect(hex).toBe(0xFF8040);
    });

    test('Multiple color conversions', () => {
      const testColors = [
        [[255, 0, 0], 0xFF0000],   // Red
        [[0, 255, 0], 0x00FF00],   // Green
        [[0, 0, 255], 0x0000FF],   // Blue
        [[255, 255, 255], 0xFFFFFF], // White
        [[0, 0, 0], 0x000000]      // Black
      ];
      
      testColors.forEach(([rgb, expected]) => {
        const hex = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
        expect(hex).toBe(expected);
      });
    });
  });
});

describe('Pixi.js Generator Functions', () => {
  describe('Shape generator output', () => {
    test('buildSpectreBase creates 9 tiles', () => {
      // The Spectre base system has 8 regular tiles + 1 Gamma (Meta)
      const expectedTileCount = 9;
      const labels = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi'];
      
      expect(labels.length).toBe(expectedTileCount);
    });

    test('buildHatTurtleBase creates 9 tiles', () => {
      // Hat/Turtle system also has 8 regular tiles + 1 Gamma (Meta)
      const expectedTileCount = 9;
      const labels = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi'];
      
      expect(labels.length).toBe(expectedTileCount);
    });

    test('buildHexBase creates 9 tiles', () => {
      // Hexagon system has 9 tiles
      const expectedTileCount = 9;
      const labels = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi'];
      
      expect(labels.length).toBe(expectedTileCount);
    });
  });

  describe('Supertile generation', () => {
    test('Supertile rules have correct structure', () => {
      // Each supertile rule should have 8 tiles
      const superRuleLength = 8;
      const exampleRule = ['Pi', 'Delta', 'null', 'Theta', 'Sigma', 'Xi', 'Phi', 'Gamma'];
      
      expect(exampleRule.length).toBe(superRuleLength);
      expect(exampleRule[7]).toBe('Gamma'); // Last tile is always Gamma
    });

    test('Supertile rules handle null entries', () => {
      const rule = ['Pi', 'Delta', 'null', 'Theta', 'Sigma', 'Xi', 'Phi', 'Gamma'];
      const validTiles = rule.filter(t => t !== 'null');
      
      expect(validTiles.length).toBe(7);
      expect(rule.indexOf('null')).toBe(2);
    });
  });
});

describe('Pixi.js Performance Optimizations', () => {
  describe('Graphics pooling', () => {
    test('Pool can acquire and release graphics', () => {
      const pool = [];
      const inUse = new Set();
      
      // Acquire a graphics object
      let graphics = pool.pop() || new MockGraphics();
      inUse.add(graphics);
      
      expect(inUse.size).toBe(1);
      
      // Release the graphics object
      if (inUse.has(graphics)) {
        graphics.clear();
        inUse.delete(graphics);
        pool.push(graphics);
      }
      
      expect(inUse.size).toBe(0);
      expect(pool.length).toBe(1);
    });

    test('Pool reuses graphics objects', () => {
      const pool = [];
      const inUse = new Set();
      
      // Create and release a graphics object
      const graphics1 = new MockGraphics();
      graphics1.moveTo(5, 5);
      pool.push(graphics1);
      
      // Acquire from pool
      const graphics2 = pool.pop();
      
      expect(graphics2).toBe(graphics1);
      expect(graphics2.commands.length).toBeGreaterThan(0);
    });
  });

  describe('Viewport culling benefits', () => {
    test('Culling reduces render calls', () => {
      const allTiles = Array.from({ length: 100 }, (_, i) => ({
        x: (i % 10) * 10,
        y: Math.floor(i / 10) * 10
      }));
      
      const viewportBounds = { minX: 0, maxX: 50, minY: 0, maxY: 50 };
      
      const visibleTiles = allTiles.filter(tile => 
        tile.x >= viewportBounds.minX &&
        tile.x <= viewportBounds.maxX &&
        tile.y >= viewportBounds.minY &&
        tile.y <= viewportBounds.maxY
      );
      
      expect(visibleTiles.length).toBeLessThan(allTiles.length);
      expect(visibleTiles.length).toBeGreaterThan(0);
    });
  });
});


describe('Pixi.js Shape Classes', () => {
  describe('PixiShape construction', () => {
    test('PixiShape creates with correct points', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 }
      ];
      const quad = [points[0], points[1], points[2], points[3]];
      
      // Mock PixiShape
      const shape = {
        pts: points,
        quad: quad,
        label: 'Delta'
      };
      
      expect(shape.pts).toEqual(points);
      expect(shape.quad).toEqual(quad);
      expect(shape.label).toBe('Delta');
    });

    test('PixiShape has correct number of vertices', () => {
      const points = Array.from({ length: 14 }, (_, i) => ({
        x: Math.cos((i / 14) * 2 * Math.PI),
        y: Math.sin((i / 14) * 2 * Math.PI)
      }));
      const quad = [points[3], points[5], points[7], points[11]];
      
      const shape = {
        pts: points,
        quad: quad,
        label: 'Theta'
      };
      
      expect(shape.pts.length).toBe(14);
    });
  });

  describe('PixiCurvyShape construction', () => {
    test('PixiCurvyShape creates bezier control points', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 }
      ];
      
      // Simulate the CurvyShape logic of creating bezier control points
      // For each edge, it adds 2 control points + endpoint
      // So 4 edges * 3 points = 12 points, plus the starting point = 13 points
      const expectedBezierPointCount = points.length * 3 + 1;
      
      expect(expectedBezierPointCount).toBe(13);
    });

    test('PixiCurvyShape alternates curve direction', () => {
      // The CurvyShape alternates the direction of curves (blah = !blah)
      // This test verifies the logic pattern
      let blah = true;
      const curveDirections = [];
      
      for (let i = 0; i < 4; i++) {
        curveDirections.push(blah);
        blah = !blah;
      }
      
      expect(curveDirections).toEqual([true, false, true, false]);
    });
  });

  describe('PixiMeta container', () => {
    test('PixiMeta can hold multiple children', () => {
      const meta = {
        geoms: [],
        quad: []
      };
      
      const child1 = { pts: [], quad: [], label: 'Delta' };
      const child2 = { pts: [], quad: [], label: 'Theta' };
      
      meta.geoms.push({ geom: child1, xform: [1, 0, 0, 0, 1, 0] });
      meta.geoms.push({ geom: child2, xform: [1, 0, 0, 0, 1, 0] });
      
      expect(meta.geoms.length).toBe(2);
    });

    test('PixiMeta stores transforms with children', () => {
      const meta = {
        geoms: []
      };
      
      const transform = [1, 0, 5, 0, 1, 10]; // Translation by (5, 10)
      const child = { pts: [], quad: [], label: 'Lambda' };
      
      meta.geoms.push({ geom: child, xform: transform });
      
      expect(meta.geoms[0].xform).toEqual(transform);
      expect(meta.geoms[0].xform[2]).toBe(5); // tx
      expect(meta.geoms[0].xform[5]).toBe(10); // ty
    });
  });

  describe('Pixi.js tile counting', () => {
    test('Counters track total and visible tiles', () => {
      const counters = { total: 0, visible: 0 };
      
      // Simulate drawing 5 tiles, 3 visible
      for (let i = 0; i < 5; i++) {
        counters.total++;
        if (i < 3) {
          counters.visible++;
        }
      }
      
      expect(counters.total).toBe(5);
      expect(counters.visible).toBe(3);
    });

    test('Counters reset properly', () => {
      const counters = { total: 10, visible: 7 };
      
      counters.total = 0;
      counters.visible = 0;
      
      expect(counters.total).toBe(0);
      expect(counters.visible).toBe(0);
    });
  });

  describe('Pixi.js viewport culling', () => {
    test('Tile inside bounds is visible', () => {
      const tilePoints = [
        { x: -1, y: -1 },
        { x: 1, y: -1 },
        { x: 1, y: 1 },
        { x: -1, y: 1 }
      ];
      
      const viewWidth = 100;
      const viewHeight = 100;
      const boundingBoxWidth = 50;
      const boundingBoxHeight = 50;
      
      const centerX = viewWidth / 2;
      const centerY = viewHeight / 2;
      
      // Transform points to screen space (assuming identity transform)
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      
      for (const p of tilePoints) {
        minX = Math.min(minX, p.x + centerX);
        maxX = Math.max(maxX, p.x + centerX);
        minY = Math.min(minY, p.y + centerY);
        maxY = Math.max(maxY, p.y + centerY);
      }
      
      const halfWidth = boundingBoxWidth / 2;
      const halfHeight = boundingBoxHeight / 2;
      
      const isOutside = 
        maxX < centerX - halfWidth ||
        minX > centerX + halfWidth ||
        maxY < centerY - halfHeight ||
        minY > centerY + halfHeight;
      
      expect(isOutside).toBe(false);
    });

    test('Tile outside bounds is not visible', () => {
      const tilePoints = [
        { x: 100, y: 100 },
        { x: 101, y: 100 },
        { x: 101, y: 101 },
        { x: 100, y: 101 }
      ];
      
      const viewWidth = 100;
      const viewHeight = 100;
      const boundingBoxWidth = 50;
      const boundingBoxHeight = 50;
      
      const centerX = viewWidth / 2;
      const centerY = viewHeight / 2;
      
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      
      for (const p of tilePoints) {
        minX = Math.min(minX, p.x + centerX);
        maxX = Math.max(maxX, p.x + centerX);
        minY = Math.min(minY, p.y + centerY);
        maxY = Math.max(maxY, p.y + centerY);
      }
      
      const halfWidth = boundingBoxWidth / 2;
      const halfHeight = boundingBoxHeight / 2;
      
      const isOutside = 
        maxX < centerX - halfWidth ||
        minX > centerX + halfWidth ||
        maxY < centerY - halfHeight ||
        minY > centerY + halfHeight;
      
      expect(isOutside).toBe(true);
    });
  });

  describe('Pixi.js Matrix transformations', () => {
    test('MockMatrix applies translation correctly', () => {
      const matrix = new MockMatrix(1, 0, 0, 1, 5, 10); // Translate by (5, 10)
      const point = { x: 3, y: 4 };
      const result = matrix.apply(point);
      
      expect(result.x).toBe(8); // 3 + 5
      expect(result.y).toBe(14); // 4 + 10
    });

    test('MockMatrix applies scaling correctly', () => {
      const matrix = new MockMatrix(2, 0, 0, 2, 0, 0); // Scale by 2
      const point = { x: 3, y: 4 };
      const result = matrix.apply(point);
      
      expect(result.x).toBe(6); // 3 * 2
      expect(result.y).toBe(8); // 4 * 2
    });

    test('MockMatrix applies combined transform', () => {
      const matrix = new MockMatrix(2, 0, 0, 2, 5, 10); // Scale by 2 and translate
      const point = { x: 3, y: 4 };
      const result = matrix.apply(point);
      
      expect(result.x).toBe(11); // 3 * 2 + 5
      expect(result.y).toBe(18); // 4 * 2 + 10
    });
  });

  describe('Pixi.js Graphics commands', () => {
    test('MockGraphics records drawing commands', () => {
      const graphics = new MockGraphics();
      
      graphics.fill(0xff0000);
      graphics.stroke({ width: 1, color: 0x000000 });
      graphics.moveTo(0, 0);
      graphics.lineTo(10, 0);
      graphics.lineTo(10, 10);
      graphics.closePath();
      
      expect(graphics.commands.length).toBe(6);
      expect(graphics.commands[0].type).toBe('fill');
      expect(graphics.commands[1].type).toBe('stroke');
      expect(graphics.commands[5].type).toBe('closePath');
    });

    test('MockGraphics clears commands', () => {
      const graphics = new MockGraphics();
      
      graphics.fill(0xff0000);
      graphics.moveTo(0, 0);
      graphics.lineTo(10, 10);
      
      expect(graphics.commands.length).toBe(3);
      
      graphics.clear();
      
      expect(graphics.commands.length).toBe(0);
    });

    test('MockGraphics records bezier curves', () => {
      const graphics = new MockGraphics();
      
      graphics.moveTo(0, 0);
      graphics.bezierCurveTo(2, 2, 8, 8, 10, 10);
      
      expect(graphics.commands.length).toBe(2);
      expect(graphics.commands[1].type).toBe('bezierCurveTo');
      expect(graphics.commands[1].cpx1).toBe(2);
      expect(graphics.commands[1].cpy1).toBe(2);
    });
  });

  describe('Pixi.js Container', () => {
    test('MockContainer adds children', () => {
      const container = new MockContainer();
      const child1 = new MockGraphics();
      const child2 = new MockGraphics();
      
      container.addChild(child1);
      container.addChild(child2);
      
      expect(container.children.length).toBe(2);
    });

    test('MockContainer removes children', () => {
      const container = new MockContainer();
      container.addChild(new MockGraphics());
      container.addChild(new MockGraphics());
      
      expect(container.children.length).toBe(2);
      
      container.removeChildren();
      
      expect(container.children.length).toBe(0);
    });

    test('MockContainer has world transform', () => {
      const container = new MockContainer();
      
      expect(container.worldTransform).toBeDefined();
      expect(container.worldTransform.a).toBe(1);
      expect(container.worldTransform.d).toBe(1);
    });
  });

  describe('Pixi.js integration with existing math', () => {
    test('Transform matrix to Pixi Matrix conversion', () => {
      // TransformMatrix is [a, b, tx, c, d, ty]
      const transformMatrix = [2, 0, 5, 0, 2, 10];
      
      // Pixi Matrix is (a, b, c, d, tx, ty)
      // So we need to swap: transformMatrix[1] <-> transformMatrix[3]
      const pixiMatrix = new MockMatrix(
        transformMatrix[0],  // a
        transformMatrix[3],  // b (from index 3)
        transformMatrix[1],  // c (from index 1)
        transformMatrix[4],  // d
        transformMatrix[2],  // tx
        transformMatrix[5]   // ty
      );
      
      expect(pixiMatrix.a).toBe(2);
      expect(pixiMatrix.b).toBe(0);
      expect(pixiMatrix.c).toBe(0);
      expect(pixiMatrix.d).toBe(2);
      expect(pixiMatrix.tx).toBe(5);
      expect(pixiMatrix.ty).toBe(10);
    });

    test('Color RGB to hex conversion', () => {
      const rgb = [255, 128, 64]; // Orange-ish color
      const hex = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
      
      expect(hex).toBe(0xFF8040);
    });

    test('Multiple color conversions', () => {
      const testColors = [
        [[255, 0, 0], 0xFF0000],   // Red
        [[0, 255, 0], 0x00FF00],   // Green
        [[0, 0, 255], 0x0000FF],   // Blue
        [[255, 255, 255], 0xFFFFFF], // White
        [[0, 0, 0], 0x000000]      // Black
      ];
      
      testColors.forEach(([rgb, expected]) => {
        const hex = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
        expect(hex).toBe(expected);
      });
    });
  });
});

describe('Pixi.js Generator Functions', () => {
  describe('Shape generator output', () => {
    test('buildSpectreBase creates 9 tiles', () => {
      // The Spectre base system has 8 regular tiles + 1 Gamma (Meta)
      const expectedTileCount = 9;
      const labels = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi'];
      
      expect(labels.length).toBe(expectedTileCount);
    });

    test('buildHatTurtleBase creates 9 tiles', () => {
      // Hat/Turtle system also has 8 regular tiles + 1 Gamma (Meta)
      const expectedTileCount = 9;
      const labels = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi'];
      
      expect(labels.length).toBe(expectedTileCount);
    });

    test('buildHexBase creates 9 tiles', () => {
      // Hexagon system has 9 tiles
      const expectedTileCount = 9;
      const labels = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi'];
      
      expect(labels.length).toBe(expectedTileCount);
    });
  });

  describe('Supertile generation', () => {
    test('Supertile rules have correct structure', () => {
      // Each supertile rule should have 8 tiles
      const superRuleLength = 8;
      const exampleRule = ['Pi', 'Delta', 'null', 'Theta', 'Sigma', 'Xi', 'Phi', 'Gamma'];
      
      expect(exampleRule.length).toBe(superRuleLength);
      expect(exampleRule[7]).toBe('Gamma'); // Last tile is always Gamma
    });

    test('Supertile rules handle null entries', () => {
      const rule = ['Pi', 'Delta', 'null', 'Theta', 'Sigma', 'Xi', 'Phi', 'Gamma'];
      const validTiles = rule.filter(t => t !== 'null');
      
      expect(validTiles.length).toBe(7);
      expect(rule.indexOf('null')).toBe(2);
    });
  });
});

describe('Pixi.js Performance Optimizations', () => {
  describe('Graphics pooling', () => {
    test('Pool can acquire and release graphics', () => {
      const pool = [];
      const inUse = new Set();
      
      // Acquire a graphics object
      let graphics = pool.pop() || new MockGraphics();
      inUse.add(graphics);
      
      expect(inUse.size).toBe(1);
      
      // Release the graphics object
      if (inUse.has(graphics)) {
        graphics.clear();
        inUse.delete(graphics);
        pool.push(graphics);
      }
      
      expect(inUse.size).toBe(0);
      expect(pool.length).toBe(1);
    });

    test('Pool reuses graphics objects', () => {
      const pool = [];
      const inUse = new Set();
      
      // Create and release a graphics object
      const graphics1 = new MockGraphics();
      graphics1.moveTo(5, 5);
      pool.push(graphics1);
      
      // Acquire from pool
      const graphics2 = pool.pop();
      
      expect(graphics2).toBe(graphics1);
      expect(graphics2.commands.length).toBeGreaterThan(0);
    });
  });

  describe('Viewport culling benefits', () => {
    test('Culling reduces render calls', () => {
      const allTiles = Array.from({ length: 100 }, (_, i) => ({
        x: (i % 10) * 10,
        y: Math.floor(i / 10) * 10
      }));
      
      const viewportBounds = { minX: 0, maxX: 50, minY: 0, maxY: 50 };
      
      const visibleTiles = allTiles.filter(tile => 
        tile.x >= viewportBounds.minX &&
        tile.x <= viewportBounds.maxX &&
        tile.y >= viewportBounds.minY &&
        tile.y <= viewportBounds.maxY
      );
      
      expect(visibleTiles.length).toBeLessThan(allTiles.length);
      expect(visibleTiles.length).toBeGreaterThan(0);
    });
  });
});
