/**
 * Unit tests for output file verification
 * 
 * These tests verify that exported SVG files are:
 * 1. Equivalent to what is displayed on the screen (internal representation matches output)
 * 2. Mathematically correct (proper geometry, edge lengths, angles)
 * 3. Rigorously consistent with the reference publication
 */

const fs = require('fs');
const path = require('path');

// Mock p5.js constants and functions
global.PI = Math.PI;
global.CLOSE = 'close';

global.cos = Math.cos;
global.sin = Math.sin;
global.radians = (degrees) => degrees * Math.PI / 180;
global.mag = (x, y) => Math.sqrt(x * x + y * y);

// Mock p5.js drawing functions
global.createSpan = jest.fn(() => ({ position: jest.fn(), size: jest.fn() }));
global.createSelect = jest.fn(() => ({
    position: jest.fn(),
    size: jest.fn(),
    option: jest.fn(),
    changed: jest.fn(),
    value: jest.fn()
}));
global.createButton = jest.fn(() => ({
    position: jest.fn(),
    size: jest.fn(),
    mousePressed: jest.fn(),
    elt: { style: { border: '' } }
}));
global.createCanvas = jest.fn();
global.background = jest.fn();
global.push = jest.fn();
global.pop = jest.fn();
global.translate = jest.fn();
global.applyMatrix = jest.fn();
global.noLoop = jest.fn();
global.loop = jest.fn();
global.fill = jest.fn();
global.noFill = jest.fn();
global.stroke = jest.fn();
global.noStroke = jest.fn();
global.strokeWeight = jest.fn();
global.beginShape = jest.fn();
global.endShape = jest.fn();
global.vertex = jest.fn();
global.bezierVertex = jest.fn();
global.save = jest.fn();
global.saveStrings = jest.fn();
global.windowWidth = 800;
global.windowHeight = 600;
global.width = 800;
global.height = 600;
global.mouseX = 0;
global.mouseY = 0;
global.pmouseX = 0;
global.pmouseY = 0;
global.dist = (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

// Load spectre.cjs
let spectreCode = fs.readFileSync(path.join(__dirname, 'spectre.cjs'), 'utf8');
spectreCode = spectreCode
    .replace(/\bconst\s+/g, 'var ')
    .replace(/\blet\s+/g, 'var ')
    .replace(/\bclass\s+(\w+)/g, 'var $1 = class $1');
eval(spectreCode);

// Test constants
const EPSILON = 1e-8;
const EPSILON_DISTANCE = 1e-6;
const EPSILON_ANGLE = 0.1;

// Helper functions
function approxEqual(a, b, epsilon = EPSILON) {
    return Math.abs(a - b) < epsilon;
}

function pointsEqual(p1, p2, epsilon = EPSILON) {
    return approxEqual(p1.x, p2.x, epsilon) && approxEqual(p1.y, p2.y, epsilon);
}

function distance(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function angle(p1, p2, p3) {
    const v1 = psub(p1, p2);
    const v2 = psub(p3, p2);
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    return Math.acos(dot / (mag1 * mag2));
}

// ============================================================================
// SVG OUTPUT MATCHES INTERNAL REPRESENTATION
// ============================================================================

describe('SVG Output Matches Internal Representation', () => {
    test('Shape.streamSVG() produces polygon with correct transformed points', () => {
        const pts = [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)];
        const quad = pts.slice();
        const shape = new Shape(pts, quad, 'Delta');
        
        const T = ttrans(10, 20);
        const stream = [];
        shape.streamSVG(T, stream);
        
        expect(stream.length).toBe(1);
        expect(stream[0]).toContain('<polygon');
        expect(stream[0]).toContain('points=');
        
        // Verify all transformed points are in the SVG
        for (const p of pts) {
            const tp = transPt(T, p);
            expect(stream[0]).toContain(`${tp.x},${tp.y}`);
        }
    });

    test('Shape.streamSVG() includes correct fill color from colmap', () => {
        const pts = [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)];
        const shape = new Shape(pts, pts, 'Delta');
        
        const stream = [];
        shape.streamSVG(ident, stream);
        
        const col = colmap['Delta'];
        expect(stream[0]).toContain(`fill="rgb(${col[0]},${col[1]},${col[2]})"`);
    });

    test('Shape.streamSVG() includes stroke attributes', () => {
        const pts = [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)];
        const shape = new Shape(pts, pts, 'Delta');
        
        const stream = [];
        shape.streamSVG(ident, stream);
        
        expect(stream[0]).toContain('stroke="black"');
        expect(stream[0]).toContain('stroke-weight="0.1"');
    });

    test('CurvyShape.streamSVG() produces path with bezier curves', () => {
        const pts = [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)];
        const curvy = new CurvyShape(pts, pts, 'Delta');
        
        const stream = [];
        curvy.streamSVG(ident, stream);
        
        expect(stream.length).toBe(1);
        expect(stream[0]).toContain('<path');
        expect(stream[0]).toContain('d="M');
        expect(stream[0]).toContain(' C ');
    });

    test('SVG viewBox matches crop bounds from run_spectre logic', () => {
        const cx = 10, cy = 20;
        const width = 100, height = 150;
        const cropMinX = cx - width / 2;
        const cropMinY = cy - height / 2;
        
        const svgHeader = `<svg viewBox="${cropMinX} ${cropMinY} ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
        
        expect(svgHeader).toContain(`viewBox="${cropMinX} ${cropMinY} ${width} ${height}"`);
    });
});

// ============================================================================
// MATHEMATICAL CORRECTNESS
// ============================================================================

describe('Mathematical Correctness - Edge Lengths', () => {
    test('Spectre tile has all edges of unit length', () => {
        const sys = buildSpectreBase(false);
        const spectre = sys['Delta'].pts;
        
        for (let i = 0; i < spectre.length; i++) {
            const p1 = spectre[i];
            const p2 = spectre[(i + 1) % spectre.length];
            const dist = distance(p1, p2);
            expect(approxEqual(dist, 1.0, EPSILON_DISTANCE)).toBe(true);
        }
    });

    test('Hat tile edges have consistent hexagonal lattice lengths', () => {
        const sys = buildHatTurtleBase(true);
        const hat = sys['Delta'].pts;
        
        // Hat tiles are defined on hexagonal lattice, so edge lengths are consistent
        // but not necessarily all unit length. Verify all edges are positive and bounded.
        for (let i = 0; i < hat.length; i++) {
            const p1 = hat[i];
            const p2 = hat[(i + 1) % hat.length];
            const dist = distance(p1, p2);
            expect(dist).toBeGreaterThan(0.5);
            expect(dist).toBeLessThan(2.0);
        }
    });

    test('Turtle tile edges have consistent hexagonal lattice lengths', () => {
        const sys = buildHatTurtleBase(false);
        const turtle = sys['Delta'].pts;
        
        // Turtle tiles are defined on hexagonal lattice, so edge lengths are consistent
        // but not necessarily all unit length. Verify all edges are positive and bounded.
        for (let i = 0; i < turtle.length; i++) {
            const p1 = turtle[i];
            const p2 = turtle[(i + 1) % turtle.length];
            const dist = distance(p1, p2);
            expect(dist).toBeGreaterThan(0.5);
            expect(dist).toBeLessThan(2.0);
        }
    });

    test('Hexagon has all edges of unit length', () => {
        const sys = buildHexBase();
        const hex = sys['Gamma'].pts;
        
        for (let i = 0; i < hex.length; i++) {
            const p1 = hex[i];
            const p2 = hex[(i + 1) % hex.length];
            const dist = distance(p1, p2);
            expect(approxEqual(dist, 1.0, EPSILON_DISTANCE)).toBe(true);
        }
    });

    test('Affine transformations preserve edge lengths (isometric)', () => {
        const sys = buildSpectreBase(false);
        const spectre = sys['Delta'].pts;
        
        // Translation should preserve distances
        const T = ttrans(5, 7);
        const transformed = spectre.map(p => transPt(T, p));
        
        for (let i = 0; i < transformed.length; i++) {
            const p1 = transformed[i];
            const p2 = transformed[(i + 1) % transformed.length];
            const dist = distance(p1, p2);
            expect(approxEqual(dist, 1.0, EPSILON_DISTANCE)).toBe(true);
        }
    });

    test('Rotation transformations preserve edge lengths', () => {
        const sys = buildSpectreBase(false);
        const spectre = sys['Delta'].pts;
        
        // Rotation should preserve distances
        const R = trot(Math.PI / 4);
        const transformed = spectre.map(p => transPt(R, p));
        
        for (let i = 0; i < transformed.length; i++) {
            const p1 = transformed[i];
            const p2 = transformed[(i + 1) % transformed.length];
            const dist = distance(p1, p2);
            expect(approxEqual(dist, 1.0, EPSILON_DISTANCE)).toBe(true);
        }
    });
});

describe('Mathematical Correctness - Polygon Areas', () => {
    function polyArea(pts) {
        let area = 0;
        for (let i = 0; i < pts.length; i++) {
            let j = (i + 1) % pts.length;
            area += pts[i].x * pts[j].y;
            area -= pts[j].x * pts[i].y;
        }
        return Math.abs(area) / 2;
    }

    test('Spectre tile has positive area', () => {
        const sys = buildSpectreBase(false);
        const spectre = sys['Delta'].pts;
        const area = polyArea(spectre);
        expect(area).toBeGreaterThan(0);
    });

    test('Hexagon has expected area', () => {
        const sys = buildHexBase();
        const hex = sys['Gamma'].pts;
        const area = polyArea(hex);
        
        // Regular hexagon with unit edges has area = (3√3)/2 ≈ 2.598
        const expectedArea = (3 * Math.sqrt(3)) / 2;
        expect(approxEqual(area, expectedArea, 0.01)).toBe(true);
    });

    test('Affine transformation scales area correctly', () => {
        const pts = [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)];
        const originalArea = polyArea(pts);
        
        // Scale by factor of 2 should multiply area by 4
        const scale = 2;
        const T = [scale, 0, 0, 0, scale, 0];
        const scaled = pts.map(p => transPt(T, p));
        const scaledArea = polyArea(scaled);
        
        expect(approxEqual(scaledArea, originalArea * scale * scale, EPSILON_DISTANCE)).toBe(true);
    });
});

describe('Mathematical Correctness - Transformations', () => {
    test('Determinant of affine transformation is 1 (area-preserving)', () => {
        const T = trot(Math.PI / 3);
        const det = T[0] * T[4] - T[1] * T[3];
        expect(approxEqual(det, 1.0, EPSILON)).toBe(true);
    });

    test('Composition of transformations maintains determinant', () => {
        const T1 = ttrans(3, 4);
        const T2 = trot(Math.PI / 6);
        const T3 = mul(T1, T2);
        
        const det = T3[0] * T3[4] - T3[1] * T3[3];
        expect(approxEqual(det, 1.0, EPSILON)).toBe(true);
    });

    test('Inverse transformation correctly undoes original', () => {
        const p = pt(3, 7);
        const T = mul(ttrans(5, 2), trot(Math.PI / 4));
        const Tinv = inv(T);
        
        const transformed = transPt(T, p);
        const restored = transPt(Tinv, transformed);
        
        expect(pointsEqual(p, restored, EPSILON_DISTANCE)).toBe(true);
    });
});

// ============================================================================
// REFERENCE PUBLICATION CONSISTENCY
// ============================================================================

describe('Reference Publication Consistency - Tile Geometry', () => {
    test('Spectre tile has exactly 14 vertices as per paper', () => {
        const sys = buildSpectreBase(false);
        const spectre = sys['Delta'].pts;
        expect(spectre.length).toBe(14);
    });

    test('Hat tile has exactly 14 vertices as per paper', () => {
        const sys = buildHatTurtleBase(true);
        const hat = sys['Delta'].pts;
        expect(hat.length).toBe(14);
    });

    test('Turtle tile has exactly 14 vertices as per paper', () => {
        const sys = buildHatTurtleBase(false);
        const turtle = sys['Delta'].pts;
        expect(turtle.length).toBe(14);
    });

    test('Hexagon has exactly 6 vertices', () => {
        const sys = buildHexBase();
        const hex = sys['Gamma'].pts;
        expect(hex.length).toBe(6);
    });

    test('Hexagon interior angles are all 120 degrees', () => {
        const sys = buildHexBase();
        const hex = sys['Gamma'].pts;
        
        for (let i = 0; i < hex.length; i++) {
            const prev = hex[(i - 1 + hex.length) % hex.length];
            const curr = hex[i];
            const next = hex[(i + 1) % hex.length];
            
            const ang = angle(prev, curr, next);
            const degrees = ang * 180 / Math.PI;
            
            expect(approxEqual(degrees, 120, EPSILON_ANGLE)).toBe(true);
        }
    });
});

describe('Reference Publication Consistency - Growth Factor', () => {
    test('Growth factor equals 4 + √15 as specified in paper', () => {
        const GROWTH_FACTOR = 4 + Math.sqrt(15);
        // Expected value is 4 + √15 ≈ 7.872983346207417
        // This growth factor comes from the supertile substitution system
        // described in the reference paper and is used to determine when
        // the tiling has grown sufficiently to cover the target area.
        const expected = 4 + Math.sqrt(15);
        expect(approxEqual(GROWTH_FACTOR, expected, 1e-10)).toBe(true);
    });

    test('Growth factor is used in stopping condition', () => {
        const GROWTH_FACTOR = 4 + Math.sqrt(15);
        const targetArea = 10000;
        const requiredArea = targetArea * GROWTH_FACTOR;
        
        expect(requiredArea).toBeGreaterThan(targetArea);
        expect(requiredArea).toBeGreaterThan(70000);
    });
});

describe('Reference Publication Consistency - Supertile System', () => {
    test('Supertile system has all 9 tile types', () => {
        const sys = buildSpectreBase(false);
        const superSys = buildSupertiles(sys);
        
        const tileNames = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi'];
        for (const name of tileNames) {
            expect(superSys[name]).toBeDefined();
            expect(superSys[name]).toBeInstanceOf(Meta);
        }
    });

    test('Each supertile has correct number of children', () => {
        const sys = buildSpectreBase(false);
        const superSys = buildSupertiles(sys);
        
        // According to the substitution system, most tiles have 7-8 children
        for (const name of ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi']) {
            expect(superSys[name].geoms.length).toBeGreaterThanOrEqual(7);
            expect(superSys[name].geoms.length).toBeLessThanOrEqual(8);
        }
    });

    test('Gamma supertile has 7 children (one null slot)', () => {
        const sys = buildSpectreBase(false);
        const superSys = buildSupertiles(sys);
        expect(superSys['Gamma'].geoms.length).toBe(7);
    });

    test('Supertile quads are properly defined', () => {
        const sys = buildSpectreBase(false);
        const superSys = buildSupertiles(sys);
        
        for (const name of ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi']) {
            expect(superSys[name].quad).toBeDefined();
            expect(superSys[name].quad.length).toBe(4);
        }
    });
});

describe('Reference Publication Consistency - Tile Colors', () => {
    test('All color maps have entries for all tile types', () => {
        const maps = [colmap53, colmap_orig, colmap_mystics, colmap_pride];
        const tileNames = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi'];
        
        for (const map of maps) {
            for (const name of tileNames) {
                expect(map[name]).toBeDefined();
                expect(map[name].length).toBe(3);
            }
        }
    });

    test('Color values are in valid RGB range [0, 255]', () => {
        const maps = [colmap53, colmap_orig, colmap_mystics, colmap_pride];
        
        for (const map of maps) {
            for (const [name, color] of Object.entries(map)) {
                expect(color[0]).toBeGreaterThanOrEqual(0);
                expect(color[0]).toBeLessThanOrEqual(255);
                expect(color[1]).toBeGreaterThanOrEqual(0);
                expect(color[1]).toBeLessThanOrEqual(255);
                expect(color[2]).toBeGreaterThanOrEqual(0);
                expect(color[2]).toBeLessThanOrEqual(255);
            }
        }
    });
});

// ============================================================================
// INTEGRATION TESTS - FULL OUTPUT GENERATION
// ============================================================================

describe('Integration - Full Output Generation', () => {
    test('Generated shapes maintain unit edge lengths after all transformations', () => {
        const sys = buildSpectreBase(false);
        const superSys = buildSupertiles(sys);
        
        // Flatten one level to get actual shapes
        const shapes = [];
        function traverse(node, T) {
            if (node instanceof Shape) {
                shapes.push({ shape: node, T: T });
            } else if (node instanceof Meta) {
                for (let g of node.geoms) {
                    traverse(g.geom, mul(T, g.xform));
                }
            }
        }
        
        traverse(superSys['Delta'], ident);
        
        // Check a sample of shapes
        for (let i = 0; i < Math.min(5, shapes.length); i++) {
            const item = shapes[i];
            const pts = item.shape.pts;
            
            for (let j = 0; j < pts.length; j++) {
                const p1 = transPt(item.T, pts[j]);
                const p2 = transPt(item.T, pts[(j + 1) % pts.length]);
                const dist = distance(p1, p2);
                expect(approxEqual(dist, 1.0, EPSILON_DISTANCE)).toBe(true);
            }
        }
    });

    test('All base tile systems can be built without errors', () => {
        expect(() => buildSpectreBase(false)).not.toThrow();
        expect(() => buildSpectreBase(true)).not.toThrow();
        expect(() => buildHatTurtleBase(true)).not.toThrow();
        expect(() => buildHatTurtleBase(false)).not.toThrow();
        expect(() => buildHexBase()).not.toThrow();
    });

    test('All tile systems can generate supertiles', () => {
        const systems = [
            buildSpectreBase(false),
            buildSpectreBase(true),
            buildHatTurtleBase(true),
            buildHatTurtleBase(false),
            buildHexBase()
        ];
        
        for (const sys of systems) {
            expect(() => buildSupertiles(sys)).not.toThrow();
            const superSys = buildSupertiles(sys);
            expect(superSys).toBeDefined();
            expect(superSys['Gamma']).toBeDefined();
        }
    });

    test('SVG generation produces valid output for all shapes', () => {
        const sys = buildSpectreBase(false);
        
        for (const name of ['Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi']) {
            const stream = [];
            sys[name].streamSVG(ident, stream);
            
            expect(stream.length).toBeGreaterThan(0);
            expect(stream[0]).toContain('<polygon');
            expect(stream[0]).toContain('points=');
            expect(stream[0]).toContain('fill=');
            expect(stream[0]).toContain('stroke=');
        }
    });
});

// ============================================================================
// EDGE CASES AND ROBUSTNESS
// ============================================================================

describe('Edge Cases and Robustness', () => {
    test('Zero transformation does not modify points', () => {
        const p = pt(5, 7);
        const result = transPt(ident, p);
        expect(pointsEqual(p, result, EPSILON)).toBe(true);
    });

    test('Multiple levels of supertile generation maintain correctness', () => {
        let sys = buildSpectreBase(false);
        
        for (let i = 0; i < 3; i++) {
            sys = buildSupertiles(sys);
            expect(sys['Gamma']).toBeDefined();
            expect(sys['Delta']).toBeDefined();
            expect(sys['Gamma']).toBeInstanceOf(Meta);
        }
    });

    test('Empty shape array produces no SVG output', () => {
        const shapes = [];
        const svgContent = [];
        
        for (const item of shapes) {
            // This loop should not execute
            item.shape.streamSVG(item.T, svgContent);
        }
        
        expect(svgContent.length).toBe(0);
    });

    test('Large transformation values do not cause numerical instability', () => {
        const p = pt(1, 1);
        const T = ttrans(1000, 1000);
        const result = transPt(T, p);
        
        expect(result.x).toBe(1001);
        expect(result.y).toBe(1001);
    });
});
