/**
 * Unit tests for standalone/spectre.cjs
 * Based on app.test.js patterns
 * 
 * These tests verify the standalone CommonJS module functionality:
 * - Core mathematical operations
 * - Affine matrix operations
 * - Tile geometry construction
 * - Shape classes and rendering
 * - Supertile substitution system
 */

const fs = require('fs');
const path = require('path');

// Mock p5.js constants and functions
global.PI = Math.PI;
global.CLOSE = 'close';

// Mock p5.js functions used in spectre.cjs
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

// Load spectre.cjs and make its variables globally accessible
// Note: eval() is necessary here because spectre.cjs is designed for browser
// environment and not as a CommonJS module. The code is from the same repository.
let spectreCode = fs.readFileSync(path.join(__dirname, 'spectre.cjs'), 'utf8');
// Replace const/let with var to ensure global visibility
spectreCode = spectreCode
    .replace(/\bconst\s+/g, 'var ')
    .replace(/\blet\s+/g, 'var ')
    .replace(/\bclass\s+(\w+)/g, 'var $1 = class $1');
eval(spectreCode);

// Test constants
const EPSILON = 1e-8;
const EPSILON_DISTANCE = 1e-6;
const EPSILON_ANGLE = 0.1; // In degrees, for angle comparisons

// Helper functions for tests
function approxEqual(a, b, epsilon = EPSILON) {
    return Math.abs(a - b) < epsilon;
}

function pointsEqual(p1, p2, epsilon = EPSILON) {
    return approxEqual(p1.x, p2.x, epsilon) && approxEqual(p1.y, p2.y, epsilon);
}

function matricesEqual(M1, M2, epsilon = EPSILON) {
    return M1.every((val, idx) => approxEqual(val, M2[idx], epsilon));
}

function distance(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function angle(p1, p2, p3) {
    // Calculate angle at p2 formed by p1-p2-p3
    const v1 = psub(p1, p2);
    const v2 = psub(p3, p2);
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    return Math.acos(dot / (mag1 * mag2));
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe('Standalone Point Operations', () => {
    test('pt() creates a point with correct coordinates', () => {
        const p = pt(3, 4);
        expect(p.x).toBe(3);
        expect(p.y).toBe(4);
    });

    test('padd() adds two points correctly', () => {
        const p1 = pt(1, 2);
        const p2 = pt(3, 4);
        const result = padd(p1, p2);
        expect(result.x).toBe(4);
        expect(result.y).toBe(6);
    });

    test('psub() subtracts two points correctly', () => {
        const p1 = pt(5, 7);
        const p2 = pt(2, 3);
        const result = psub(p1, p2);
        expect(result.x).toBe(3);
        expect(result.y).toBe(4);
    });

    test('pframe() computes frame coordinates correctly', () => {
        const o = pt(0, 0);
        const p = pt(1, 0);
        const q = pt(0, 1);
        const result = pframe(o, p, q, 2, 3);
        expect(result.x).toBe(2);
        expect(result.y).toBe(3);
    });

    test('pframe() with non-zero origin', () => {
        const o = pt(1, 1);
        const p = pt(1, 0);
        const q = pt(0, 1);
        const result = pframe(o, p, q, 2, 3);
        expect(result.x).toBe(3);
        expect(result.y).toBe(4);
    });
});

describe('Standalone Affine Matrix Operations', () => {
    test('identity matrix is correct', () => {
        expect(ident).toEqual([1, 0, 0, 0, 1, 0]);
    });

    test('ttrans() creates translation matrix', () => {
        const T = ttrans(3, 4);
        expect(T).toEqual([1, 0, 3, 0, 1, 4]);
    });

    test('trot() creates rotation matrix for 0 degrees', () => {
        const T = trot(0);
        expect(matricesEqual(T, [1, 0, 0, 0, 1, 0])).toBe(true);
    });

    test('trot() creates rotation matrix for 90 degrees', () => {
        const T = trot(Math.PI / 2);
        expect(matricesEqual(T, [0, -1, 0, 1, 0, 0])).toBe(true);
    });

    test('mul() multiplies two identity matrices', () => {
        const result = mul(ident, ident);
        expect(matricesEqual(result, ident)).toBe(true);
    });

    test('mul() multiplies translation matrices', () => {
        const T1 = ttrans(1, 2);
        const T2 = ttrans(3, 4);
        const result = mul(T1, T2);
        expect(matricesEqual(result, ttrans(4, 6))).toBe(true);
    });

    test('inv() inverts identity matrix', () => {
        const result = inv(ident);
        expect(matricesEqual(result, ident)).toBe(true);
    });

    test('inv() inverts translation matrix', () => {
        const T = ttrans(3, 4);
        const Tinv = inv(T);
        expect(matricesEqual(Tinv, ttrans(-3, -4))).toBe(true);
    });

    test('inv() followed by mul() gives identity', () => {
        const T = ttrans(5, 7);
        const Tinv = inv(T);
        const result = mul(T, Tinv);
        expect(matricesEqual(result, ident)).toBe(true);
    });

    test('transPt() transforms point with identity', () => {
        const p = pt(3, 4);
        const result = transPt(ident, p);
        expect(pointsEqual(result, p)).toBe(true);
    });

    test('transPt() transforms point with translation', () => {
        const p = pt(1, 2);
        const T = ttrans(3, 4);
        const result = transPt(T, p);
        expect(pointsEqual(result, pt(4, 6))).toBe(true);
    });

    test('transPt() transforms point with rotation', () => {
        const p = pt(1, 0);
        const R = trot(Math.PI / 2);
        const result = transPt(R, p);
        expect(pointsEqual(result, pt(0, 1))).toBe(true);
    });

    test('transTo() creates correct translation matrix', () => {
        const p1 = pt(1, 2);
        const p2 = pt(4, 6);
        const T = transTo(p1, p2);
        expect(matricesEqual(T, ttrans(3, 4))).toBe(true);
    });

    test('rotAbout() rotates about origin', () => {
        const p = pt(0, 0);
        const R = rotAbout(p, Math.PI / 2);
        const result = transPt(R, pt(1, 0));
        expect(pointsEqual(result, pt(0, 1))).toBe(true);
    });

    test('rotAbout() rotates about non-origin point', () => {
        const center = pt(1, 0);
        const R = rotAbout(center, Math.PI / 2);
        const p = pt(2, 0);
        const result = transPt(R, p);
        expect(pointsEqual(result, pt(1, 1))).toBe(true);
    });

    test('matchSeg() creates correct transformation matrix', () => {
        const p = pt(0, 0);
        const q = pt(1, 0);
        const M = matchSeg(p, q);
        const t0 = transPt(M, pt(0, 0));
        const t1 = transPt(M, pt(1, 0));
        expect(pointsEqual(t0, p)).toBe(true);
        expect(pointsEqual(t1, q)).toBe(true);
    });

    test('matchTwo() matches two line segments', () => {
        const p1 = pt(0, 0);
        const q1 = pt(1, 0);
        const p2 = pt(2, 3);
        const q2 = pt(5, 7);
        const M = matchTwo(p1, q1, p2, q2);
        const result1 = transPt(M, p1);
        const result2 = transPt(M, q1);
        expect(pointsEqual(result1, p2)).toBe(true);
        expect(pointsEqual(result2, q2)).toBe(true);
    });
});

describe('Standalone Spectre Tile Geometry', () => {
    let sys;

    beforeAll(() => {
        sys = buildSpectreBase(false);
    });

    test('buildSpectreBase() returns system with all tile types', () => {
        expect(sys).toBeDefined();
        expect(sys['Gamma']).toBeDefined();
        expect(sys['Delta']).toBeDefined();
        expect(sys['Theta']).toBeDefined();
        expect(sys['Lambda']).toBeDefined();
        expect(sys['Xi']).toBeDefined();
        expect(sys['Pi']).toBeDefined();
        expect(sys['Sigma']).toBeDefined();
        expect(sys['Phi']).toBeDefined();
        expect(sys['Psi']).toBeDefined();
    });

    test('Gamma is a Meta object with composite structure', () => {
        expect(sys['Gamma']).toBeInstanceOf(Meta);
        expect(sys['Gamma'].geoms.length).toBeGreaterThan(0);
    });

    test('Non-Gamma tiles are Shape objects', () => {
        expect(sys['Delta']).toBeInstanceOf(Shape);
        expect(sys['Theta']).toBeInstanceOf(Shape);
        expect(sys['Lambda']).toBeInstanceOf(Shape);
    });

    test('Each tile has a quad property', () => {
        for (const name of ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi']) {
            expect(sys[name].quad).toBeDefined();
            expect(sys[name].quad.length).toBe(4);
        }
    });

    test('buildSpectreBase(true) creates CurvyShape objects', () => {
        const curvedSys = buildSpectreBase(true);
        expect(curvedSys['Delta']).toBeInstanceOf(CurvyShape);
    });

    test('Spectre tile has 14 vertices', () => {
        const spectre = sys['Delta'].pts;
        expect(spectre.length).toBe(14);
    });

    test('Spectre has unit-length edges', () => {
        const spectre = sys['Delta'].pts;
        for (let i = 0; i < spectre.length; i++) {
            const p1 = spectre[i];
            const p2 = spectre[(i + 1) % spectre.length];
            const dist = distance(p1, p2);
            expect(approxEqual(dist, 1.0, EPSILON_DISTANCE)).toBe(true);
        }
    });
});

describe('Standalone Hat and Turtle Tile Geometry', () => {
    test('buildHatTurtleBase(true) returns system with hat dominant', () => {
        const sys = buildHatTurtleBase(true);
        expect(sys).toBeDefined();
        expect(sys['Gamma']).toBeInstanceOf(Meta);
        expect(sys['Delta']).toBeInstanceOf(Shape);
    });

    test('buildHatTurtleBase(false) returns system with turtle dominant', () => {
        const sys = buildHatTurtleBase(false);
        expect(sys).toBeDefined();
        expect(sys['Gamma']).toBeInstanceOf(Meta);
        expect(sys['Delta']).toBeInstanceOf(Shape);
    });

    test('Hat tile has 14 vertices', () => {
        const sys = buildHatTurtleBase(true);
        expect(sys['Delta'].pts.length).toBe(14);
    });

    test('Turtle tile has 14 vertices', () => {
        const sys = buildHatTurtleBase(false);
        expect(sys['Delta'].pts.length).toBe(14);
    });

    test('Mystic in hat system has composite structure', () => {
        const sys = buildHatTurtleBase(true);
        expect(sys['Gamma'].geoms.length).toBe(2);
    });
});

describe('Standalone Hexagon Tile Geometry', () => {
    let sys;

    beforeAll(() => {
        sys = buildHexBase();
    });

    test('buildHexBase() returns system with all tile types', () => {
        expect(sys).toBeDefined();
        for (const name of ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi']) {
            expect(sys[name]).toBeDefined();
            expect(sys[name]).toBeInstanceOf(Shape);
        }
    });

    test('Hexagon has 6 vertices', () => {
        expect(sys['Gamma'].pts.length).toBe(6);
    });

    test('Hexagon has unit edge lengths', () => {
        const hex = sys['Gamma'].pts;
        for (let i = 0; i < hex.length; i++) {
            const p1 = hex[i];
            const p2 = hex[(i + 1) % hex.length];
            const dist = distance(p1, p2);
            expect(approxEqual(dist, 1.0, EPSILON_DISTANCE)).toBe(true);
        }
    });

    test('Hexagon interior angles are all 120 degrees', () => {
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

describe('Standalone Shape Classes', () => {
    test('Shape constructor initializes correctly', () => {
        const pts = [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)];
        const quad = [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)];
        const shape = new Shape(pts, quad, 'Delta');
        
        expect(shape.pts).toEqual(pts);
        expect(shape.quad).toEqual(quad);
        expect(shape.label).toBe('Delta');
    });

    test('Shape.draw() calls drawing functions', () => {
        const pts = [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)];
        const quad = [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)];
        const shape = new Shape(pts, quad, 'Delta');
        
        global.fill.mockClear();
        global.beginShape.mockClear();
        global.vertex.mockClear();
        global.endShape.mockClear();
        
        shape.draw(ident);
        
        expect(global.fill).toHaveBeenCalled();
        expect(global.beginShape).toHaveBeenCalled();
        expect(global.vertex).toHaveBeenCalled();
        expect(global.endShape).toHaveBeenCalled();
    });

    test('Shape.streamSVG() generates SVG polygon', () => {
        const pts = [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)];
        const quad = [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)];
        const shape = new Shape(pts, quad, 'Delta');
        
        const stream = [];
        shape.streamSVG(ident, stream);
        
        expect(stream.length).toBe(1);
        expect(stream[0]).toContain('<polygon');
        expect(stream[0]).toContain('points=');
    });

    test('CurvyShape constructor creates curved edges', () => {
        const pts = [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)];
        const quad = [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)];
        const curvy = new CurvyShape(pts, quad, 'Delta');
        
        expect(curvy.pts.length).toBeGreaterThan(pts.length);
        expect(curvy.label).toBe('Delta');
    });

    test('CurvyShape.draw() calls bezier drawing functions', () => {
        const pts = [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)];
        const quad = [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)];
        const curvy = new CurvyShape(pts, quad, 'Delta');
        
        global.fill.mockClear();
        global.beginShape.mockClear();
        global.bezierVertex.mockClear();
        global.endShape.mockClear();
        
        curvy.draw(ident);
        
        expect(global.fill).toHaveBeenCalled();
        expect(global.beginShape).toHaveBeenCalled();
        expect(global.bezierVertex).toHaveBeenCalled();
        expect(global.endShape).toHaveBeenCalled();
    });

    test('Meta constructor initializes empty', () => {
        const meta = new Meta();
        expect(meta.geoms).toEqual([]);
        expect(meta.quad).toEqual([]);
    });

    test('Meta.addChild() adds child geometry', () => {
        const meta = new Meta();
        const pts = [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)];
        const shape = new Shape(pts, [], 'Delta');
        
        meta.addChild(shape, ident);
        
        expect(meta.geoms.length).toBe(1);
        expect(meta.geoms[0].geom).toBe(shape);
        expect(meta.geoms[0].xform).toEqual(ident);
    });

    test('Meta.draw() draws all children', () => {
        const meta = new Meta();
        const pts = [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)];
        const shape1 = new Shape(pts, [], 'Delta');
        const shape2 = new Shape(pts, [], 'Theta');
        
        meta.addChild(shape1, ident);
        meta.addChild(shape2, ident);
        
        global.beginShape.mockClear();
        
        meta.draw(ident);
        
        expect(global.beginShape.mock.calls.length).toBe(2);
    });
});

describe('Standalone Supertile Substitution System', () => {
    test('buildSupertiles() creates supertiles from base system', () => {
        const sys = buildSpectreBase(false);
        const superSys = buildSupertiles(sys);
        
        expect(superSys).toBeDefined();
        expect(superSys['Gamma']).toBeDefined();
        expect(superSys['Delta']).toBeDefined();
    });

    test('Supertiles are Meta objects', () => {
        const sys = buildSpectreBase(false);
        const superSys = buildSupertiles(sys);
        
        expect(superSys['Gamma']).toBeInstanceOf(Meta);
        expect(superSys['Delta']).toBeInstanceOf(Meta);
    });

    test('Each supertile has correct number of children', () => {
        const sys = buildSpectreBase(false);
        const superSys = buildSupertiles(sys);
        
        // Most supertiles have 8 children, some have 7 (one 'null')
        for (const name of ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi']) {
            expect(superSys[name].geoms.length).toBeGreaterThanOrEqual(7);
            expect(superSys[name].geoms.length).toBeLessThanOrEqual(8);
        }
    });

    test('Gamma supertile has 7 children (one null)', () => {
        const sys = buildSpectreBase(false);
        const superSys = buildSupertiles(sys);
        
        expect(superSys['Gamma'].geoms.length).toBe(7);
    });

    test('buildSupertiles() can be called multiple times', () => {
        let sys = buildSpectreBase(false);
        sys = buildSupertiles(sys);
        const superSuperSys = buildSupertiles(sys);
        
        expect(superSuperSys).toBeDefined();
        expect(superSuperSys['Gamma']).toBeInstanceOf(Meta);
    });

    test('Each supertile has a quad property', () => {
        const sys = buildSpectreBase(false);
        const superSys = buildSupertiles(sys);
        
        for (const name of ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi']) {
            expect(superSys[name].quad).toBeDefined();
            expect(superSys[name].quad.length).toBe(4);
        }
    });
});

describe('Standalone Color Maps', () => {
    test('colmap53 is defined with all tile types', () => {
        expect(colmap53).toBeDefined();
        expect(colmap53['Gamma']).toEqual([203, 157, 126]);
        expect(colmap53['Delta']).toEqual([163, 150, 133]);
    });

    test('colmap_orig is defined with all tile types', () => {
        expect(colmap_orig).toBeDefined();
        expect(colmap_orig['Gamma']).toEqual([255, 255, 255]);
        expect(colmap_orig['Delta']).toEqual([220, 220, 220]);
    });

    test('colmap_mystics is defined with all tile types', () => {
        expect(colmap_mystics).toBeDefined();
        expect(colmap_mystics['Gamma']).toEqual([196, 201, 169]);
    });

    test('colmap_pride is defined with all tile types', () => {
        expect(colmap_pride).toBeDefined();
        expect(colmap_pride['Gamma']).toEqual([255, 255, 255]);
    });

    test('All color maps have RGB values in valid range', () => {
        const maps = [colmap53, colmap_orig, colmap_mystics, colmap_pride];
        for (const map of maps) {
            for (const [name, color] of Object.entries(map)) {
                expect(color.length).toBe(3);
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

describe('Standalone Mathematical Constants', () => {
    test('PI constant is accurate', () => {
        expect(approxEqual(Math.PI, 3.14159265358979, 1e-10)).toBe(true);
    });

    test('radians conversion is correct', () => {
        expect(approxEqual(radians(180), Math.PI)).toBe(true);
        expect(approxEqual(radians(90), Math.PI / 2)).toBe(true);
        expect(approxEqual(radians(60), Math.PI / 3)).toBe(true);
    });

    test('cos and sin functions work correctly', () => {
        expect(approxEqual(cos(0), 1)).toBe(true);
        expect(approxEqual(sin(0), 0)).toBe(true);
        expect(approxEqual(cos(Math.PI / 2), 0)).toBe(true);
        expect(approxEqual(sin(Math.PI / 2), 1)).toBe(true);
    });
});

describe('Standalone UI Functions', () => {
    test('isButtonActive() checks button border', () => {
        const but = { elt: { style: { border: '' } } };
        expect(isButtonActive(but)).toBe(false);
        
        but.elt.style.border = '3px solid black';
        expect(isButtonActive(but)).toBe(true);
    });

    test('setButtonActive() sets button border', () => {
        const but = { elt: { style: { border: '' } } };
        
        setButtonActive(but, true);
        expect(but.elt.style.border).toBe('3px solid black');
        
        setButtonActive(but, false);
        expect(but.elt.style.border).toBe('');
    });
});

describe('Standalone Edge Cases', () => {
    test('Zero vector transformation', () => {
        const p = pt(0, 0);
        const T = ttrans(5, 7);
        const result = transPt(T, p);
        expect(pointsEqual(result, pt(5, 7))).toBe(true);
    });

    test('Multiple transformations compose correctly', () => {
        const T1 = ttrans(1, 0);
        const T2 = trot(Math.PI / 2);
        const T3 = ttrans(0, 1);
        
        const combined = mul(T3, mul(T2, T1));
        const p = pt(0, 0);
        const result = transPt(combined, p);
        
        expect(pointsEqual(result, pt(0, 2))).toBe(true);
    });

    test('Point frame with zero coefficients', () => {
        const o = pt(1, 1);
        const p = pt(1, 0);
        const q = pt(0, 1);
        const result = pframe(o, p, q, 0, 0);
        expect(pointsEqual(result, o)).toBe(true);
    });
});

describe('Standalone Determinant Properties', () => {
    test('Identity matrix has determinant 1', () => {
        const det = ident[0] * ident[4] - ident[1] * ident[3];
        expect(det).toBe(1);
    });

    test('Rotation matrix has determinant 1', () => {
        const R = trot(Math.PI / 4);
        const det = R[0] * R[4] - R[1] * R[3];
        expect(approxEqual(det, 1.0)).toBe(true);
    });

    test('Translation matrix has determinant 1', () => {
        const T = ttrans(3, 4);
        const det = T[0] * T[4] - T[1] * T[3];
        expect(det).toBe(1);
    });
});

describe('Standalone Integration Tests', () => {
    test('Full workflow: build base, create supertiles, render', () => {
        // Build base system
        const sys = buildSpectreBase(false);
        expect(sys).toBeDefined();
        
        // Create supertiles
        const superSys = buildSupertiles(sys);
        expect(superSys).toBeDefined();
        
        // Mock draw call
        global.beginShape.mockClear();
        superSys['Gamma'].draw(ident);
        expect(global.beginShape).toHaveBeenCalled();
    });

    test('System can cycle through multiple tile types', () => {
        const sys = buildSpectreBase(false);
        const tileNames = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi'];
        
        for (const name of tileNames) {
            expect(sys[name]).toBeDefined();
            expect(sys[name].quad).toBeDefined();
            expect(sys[name].quad.length).toBe(4);
        }
    });

    test('SVG generation works for all tile types', () => {
        const sys = buildSpectreBase(false);
        
        for (const name of ['Delta', 'Theta']) {
            const stream = [];
            sys[name].streamSVG(ident, stream);
            expect(stream.length).toBeGreaterThan(0);
            expect(stream[0]).toContain('<polygon');
        }
    });
});
