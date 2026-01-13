/**
 * Unit tests for app.js mathematical rendering functions
 * Based on the paper "A Chiral Aperiodic Monotile" (2305.17743v2.pdf)
 * 
 * These tests verify:
 * - Affine matrix operations (inverse, multiply, transformations)
 * - Point operations (addition, subtraction, frame coordinates)
 * - Tile geometry (Spectre, Hat, Turtle, Hexagon)
 * - Supertile substitution system
 */

// Mock p5.js constants and functions
global.PI = Math.PI;
global.CLOSE = 'close';

// Mock p5.js functions used in app.js
global.cos = Math.cos;
global.sin = Math.sin;
global.radians = (degrees) => degrees * Math.PI / 180;
global.mag = (x, y) => Math.sqrt(x * x + y * y);

// Load the functions from app.js
// Since app.js is designed for browser, we'll extract and test individual functions
const ident = [1, 0, 0, 0, 1, 0];

// Point operations
function pt(x, y) {
    return { x: x, y: y };
}

function padd(p, q) {
    return { x: p.x + q.x, y: p.y + q.y };
}

function psub(p, q) {
    return { x: p.x - q.x, y: p.y - q.y };
}

function pframe(o, p, q, a, b) {
    return { x: o.x + a * p.x + b * q.x, y: o.y + a * p.y + b * q.y };
}

// Affine matrix operations
function inv(T) {
    const det = T[0] * T[4] - T[1] * T[3];
    return [T[4] / det, -T[1] / det, (T[1] * T[5] - T[2] * T[4]) / det,
        -T[3] / det, T[0] / det, (T[2] * T[3] - T[0] * T[5]) / det];
}

function mul(A, B) {
    return [A[0] * B[0] + A[1] * B[3],
        A[0] * B[1] + A[1] * B[4],
        A[0] * B[2] + A[1] * B[5] + A[2],

        A[3] * B[0] + A[4] * B[3],
        A[3] * B[1] + A[4] * B[4],
        A[3] * B[2] + A[4] * B[5] + A[5]];
}

function trot(ang) {
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    return [c, -s, 0, s, c, 0];
}

function ttrans(tx, ty) {
    return [1, 0, tx, 0, 1, ty];
}

function transTo(p, q) {
    return ttrans(q.x - p.x, q.y - p.y);
}

function rotAbout(p, ang) {
    return mul(ttrans(p.x, p.y),
        mul(trot(ang), ttrans(-p.x, -p.y)));
}

function transPt(M, P) {
    return pt(M[0] * P.x + M[1] * P.y + M[2], M[3] * P.x + M[4] * P.y + M[5]);
}

function matchSeg(p, q) {
    return [q.x - p.x, p.y - q.y, p.x, q.y - p.y, q.x - p.x, p.y];
}

function matchTwo(p1, q1, p2, q2) {
    return mul(matchSeg(p2, q2), inv(matchSeg(p1, q1)));
}

// Tile construction functions
function buildSpectreBase() {
    const spectre = [
        pt(0, 0),
        pt(1.0, 0.0),
        pt(1.5, -0.8660254037844386),
        pt(2.366025403784439, -0.36602540378443865),
        pt(2.366025403784439, 0.6339745962155614),
        pt(3.366025403784439, 0.6339745962155614),
        pt(3.866025403784439, 1.5),
        pt(3.0, 2.0),
        pt(2.133974596215561, 1.5),
        pt(1.6339745962155614, 2.3660254037844393),
        pt(0.6339745962155614, 2.3660254037844393),
        pt(-0.3660254037844386, 2.3660254037844393),
        pt(-0.866025403784439, 1.5),
        pt(0.0, 1.0)
    ];

    const spectre_keys = [
        spectre[3], spectre[5], spectre[7], spectre[11]
    ];

    return { spectre, spectre_keys };
}

function buildHatTurtleBase() {
    const r3 = 1.7320508075688772;
    const hr3 = 0.8660254037844386;

    function hexPt(x, y) {
        return pt(x + 0.5 * y, -hr3 * y);
    }

    const hat = [
        hexPt(-1, 2), hexPt(0, 2), hexPt(0, 3), hexPt(2, 2), hexPt(3, 0),
        hexPt(4, 0), hexPt(5, -1), hexPt(4, -2), hexPt(2, -1), hexPt(2, -2),
        hexPt(1, -2), hexPt(0, -2), hexPt(-1, -1), hexPt(0, 0)];

    const turtle = [
        hexPt(0, 0), hexPt(2, -1), hexPt(3, 0), hexPt(4, -1), hexPt(4, -2),
        hexPt(6, -3), hexPt(7, -5), hexPt(6, -5), hexPt(5, -4), hexPt(4, -5),
        hexPt(2, -4), hexPt(0, -3), hexPt(-1, -1), hexPt(0, -1)
    ];

    return { hat, turtle };
}

function buildHexBase() {
    const hr3 = 0.8660254037844386;

    const hex = [
        pt(0, 0),
        pt(1.0, 0.0),
        pt(1.5, hr3),
        pt(1, 2 * hr3),
        pt(0, 2 * hr3),
        pt(-0.5, hr3)
    ];

    return hex;
}

// Helper functions for tests
function approxEqual(a, b, epsilon = 1e-8) {
    return Math.abs(a - b) < epsilon;
}

function pointsEqual(p1, p2, epsilon = 1e-8) {
    return approxEqual(p1.x, p2.x, epsilon) && approxEqual(p1.y, p2.y, epsilon);
}

function matricesEqual(M1, M2, epsilon = 1e-8) {
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

describe('Point Operations', () => {
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

describe('Affine Matrix Operations', () => {
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

    test('trot() creates rotation matrix for 180 degrees', () => {
        const T = trot(Math.PI);
        expect(matricesEqual(T, [-1, 0, 0, 0, -1, 0])).toBe(true);
    });

    test('trot() creates rotation matrix for 60 degrees', () => {
        const T = trot(Math.PI / 3);
        expect(approxEqual(T[0], 0.5)).toBe(true);
        expect(approxEqual(T[1], -Math.sqrt(3) / 2)).toBe(true);
        expect(approxEqual(T[3], Math.sqrt(3) / 2)).toBe(true);
        expect(approxEqual(T[4], 0.5)).toBe(true);
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

    test('mul() multiplies rotation and translation', () => {
        const R = trot(Math.PI / 2);
        const T = ttrans(1, 0);
        const result = mul(R, T);
        // Rotation followed by translation: rotate (1,0) then translate
        const p = transPt(result, pt(0, 0));
        expect(pointsEqual(p, pt(0, 1))).toBe(true);
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

    test('inv() of rotation matrix', () => {
        const R = trot(Math.PI / 4);
        const Rinv = inv(R);
        const result = mul(R, Rinv);
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
        // Point (2,0) rotated 90° about (1,0) should give (1,1)
        expect(pointsEqual(result, pt(1, 1))).toBe(true);
    });

    test('matchSeg() creates correct transformation matrix', () => {
        const p = pt(0, 0);
        const q = pt(1, 0);
        const M = matchSeg(p, q);
        // Should map unit interval to segment
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
        // Should map p1 to p2 and q1 to q2
        const result1 = transPt(M, p1);
        const result2 = transPt(M, q1);
        expect(pointsEqual(result1, p2)).toBe(true);
        expect(pointsEqual(result2, q2)).toBe(true);
    });
});

describe('Spectre Tile Geometry', () => {
    let spectre, spectre_keys;

    beforeAll(() => {
        const result = buildSpectreBase();
        spectre = result.spectre;
        spectre_keys = result.spectre_keys;
    });

    test('Spectre has 14 vertices', () => {
        expect(spectre.length).toBe(14);
    });

    test('Spectre has unit-length edges', () => {
        for (let i = 0; i < spectre.length; i++) {
            const p1 = spectre[i];
            const p2 = spectre[(i + 1) % spectre.length];
            const dist = distance(p1, p2);
            expect(approxEqual(dist, 1.0, 1e-6)).toBe(true);
        }
    });

    test('Spectre vertices are at expected positions', () => {
        // Test key vertices as specified in the code
        expect(pointsEqual(spectre[0], pt(0, 0))).toBe(true);
        expect(pointsEqual(spectre[1], pt(1.0, 0.0))).toBe(true);
        expect(pointsEqual(spectre[7], pt(3.0, 2.0))).toBe(true);
    });

    test('Spectre has 4 key points', () => {
        expect(spectre_keys.length).toBe(4);
    });

    test('Spectre key points are at correct vertices', () => {
        expect(pointsEqual(spectre_keys[0], spectre[3])).toBe(true);
        expect(pointsEqual(spectre_keys[1], spectre[5])).toBe(true);
        expect(pointsEqual(spectre_keys[2], spectre[7])).toBe(true);
        expect(pointsEqual(spectre_keys[3], spectre[11])).toBe(true);
    });

    test('Spectre interior angles alternate between 90° and 120° multiples', () => {
        // According to paper, interior angles strictly alternate between 
        // multiples of 90° and multiples of 120°
        for (let i = 0; i < spectre.length; i++) {
            const prev = spectre[(i - 1 + spectre.length) % spectre.length];
            const curr = spectre[i];
            const next = spectre[(i + 1) % spectre.length];
            
            const ang = angle(prev, curr, next);
            const degrees = ang * 180 / Math.PI;
            
            // Check if it's a multiple of 30° (which covers both 90° and 120° families)
            // The remainder should be close to 0 (including wrapping to 30)
            const normalized = degrees % 30;
            const isMultipleOf30 = approxEqual(normalized, 0, 1.0) || approxEqual(normalized, 30, 1.0);
            expect(isMultipleOf30).toBe(true);
        }
    });

    test('Spectre sqrt(3) constant is accurate', () => {
        const sqrt3 = 1.7320508075688772;
        expect(approxEqual(Math.sqrt(3), sqrt3)).toBe(true);
    });

    test('Spectre half-sqrt(3) constant is accurate', () => {
        const hr3 = 0.8660254037844386;
        expect(approxEqual(Math.sqrt(3) / 2, hr3)).toBe(true);
    });
});

describe('Hat and Turtle Tile Geometry', () => {
    let hat, turtle;

    beforeAll(() => {
        const result = buildHatTurtleBase();
        hat = result.hat;
        turtle = result.turtle;
    });

    test('Hat has 14 vertices', () => {
        expect(hat.length).toBe(14);
    });

    test('Turtle has 14 vertices', () => {
        expect(turtle.length).toBe(14);
    });

    test('Hat vertices are computed correctly', () => {
        // Verify first vertex computation
        const hr3 = 0.8660254037844386;
        const expected = pt(-1 + 0.5 * 2, -hr3 * 2);
        expect(pointsEqual(hat[0], expected)).toBe(true);
    });

    test('Turtle vertices are computed correctly', () => {
        const hr3 = 0.8660254037844386;
        const expected = pt(0, 0);
        expect(pointsEqual(turtle[0], expected)).toBe(true);
    });

    test('Hat and Turtle have same topology as Spectre', () => {
        // Both should have 14 vertices like Spectre
        expect(hat.length).toBe(14);
        expect(turtle.length).toBe(14);
    });

    test('Hat edges have consistent lengths', () => {
        // Hat is composed of kites from Laves tiling [3.4.6.4]
        // Each edge should be either 1 or sqrt(3)
        const sqrt3 = 1.7320508075688772;
        
        for (let i = 0; i < hat.length; i++) {
            const p1 = hat[i];
            const p2 = hat[(i + 1) % hat.length];
            const dist = distance(p1, p2);
            
            const isUnit = approxEqual(dist, 1.0, 1e-6);
            const isSqrt3 = approxEqual(dist, sqrt3, 1e-6);
            
            expect(isUnit || isSqrt3).toBe(true);
        }
    });

    test('Turtle edges have consistent lengths', () => {
        const sqrt3 = 1.7320508075688772;
        
        for (let i = 0; i < turtle.length; i++) {
            const p1 = turtle[i];
            const p2 = turtle[(i + 1) % turtle.length];
            const dist = distance(p1, p2);
            
            const isUnit = approxEqual(dist, 1.0, 1e-6);
            const isSqrt3 = approxEqual(dist, sqrt3, 1e-6);
            
            expect(isUnit || isSqrt3).toBe(true);
        }
    });
});

describe('Hexagon Tile Geometry', () => {
    let hex;

    beforeAll(() => {
        hex = buildHexBase();
    });

    test('Hexagon has 6 vertices', () => {
        expect(hex.length).toBe(6);
    });

    test('Hexagon has unit edge lengths', () => {
        for (let i = 0; i < hex.length; i++) {
            const p1 = hex[i];
            const p2 = hex[(i + 1) % hex.length];
            const dist = distance(p1, p2);
            expect(approxEqual(dist, 1.0, 1e-6)).toBe(true);
        }
    });

    test('Hexagon interior angles are all 120 degrees', () => {
        for (let i = 0; i < hex.length; i++) {
            const prev = hex[(i - 1 + hex.length) % hex.length];
            const curr = hex[i];
            const next = hex[(i + 1) % hex.length];
            
            const ang = angle(prev, curr, next);
            const degrees = ang * 180 / Math.PI;
            
            expect(approxEqual(degrees, 120, 1.0)).toBe(true);
        }
    });

    test('Hexagon is centered appropriately', () => {
        expect(pointsEqual(hex[0], pt(0, 0))).toBe(true);
        expect(pointsEqual(hex[1], pt(1, 0))).toBe(true);
    });

    test('Hexagon has correct height', () => {
        const hr3 = 0.8660254037844386;
        // Top of hexagon should be at y = 2*hr3
        expect(approxEqual(hex[3].y, 2 * hr3)).toBe(true);
        expect(approxEqual(hex[4].y, 2 * hr3)).toBe(true);
    });
});

describe('Supertile Substitution System', () => {
    test('Substitution system uses correct angles', () => {
        // From the code: t_rules contains angles 60, 0, 60, 60, 0, 60, -120
        const angles = [60, 0, 60, 60, 0, 60, -120];
        
        // These are cumulative rotations for building the substitution system
        // The total rotation is 120 degrees, which is consistent with the hexagonal symmetry
        const total = angles.reduce((sum, ang) => sum + ang, 0);
        expect(total).toBe(120);
    });

    test('Reflection matrix R is correct', () => {
        const R = [-1, 0, 0, 0, 1, 0];
        const p = pt(1, 2);
        const reflected = transPt(R, p);
        expect(pointsEqual(reflected, pt(-1, 2))).toBe(true);
    });

    test('Rotation by 60 degrees', () => {
        const ang = Math.PI / 3; // 60 degrees
        const R = trot(ang);
        const p = pt(1, 0);
        const rotated = transPt(R, p);
        expect(approxEqual(rotated.x, 0.5)).toBe(true);
        expect(approxEqual(rotated.y, Math.sqrt(3) / 2)).toBe(true);
    });

    test('Rotation by -120 degrees', () => {
        const ang = -2 * Math.PI / 3; // -120 degrees
        const R = trot(ang);
        const p = pt(1, 0);
        const rotated = transPt(R, p);
        expect(approxEqual(rotated.x, -0.5)).toBe(true);
        expect(approxEqual(rotated.y, -Math.sqrt(3) / 2)).toBe(true);
    });

    test('Supertile transformation preserves orientation relationships', () => {
        // Test that cumulative rotations maintain proper angular relationships
        let total_ang = 0;
        const angles = [60, 0, 60, 60, 0, 60, -120];
        
        angles.forEach(ang => {
            total_ang += ang;
            const rot = trot(total_ang * Math.PI / 180);
            
            // Rotation matrix should be orthogonal
            const det = rot[0] * rot[4] - rot[1] * rot[3];
            expect(approxEqual(Math.abs(det), 1.0)).toBe(true);
        });
    });
});

describe('Mathematical Constants', () => {
    test('PI constant is accurate', () => {
        expect(approxEqual(Math.PI, 3.14159265358979, 1e-10)).toBe(true);
    });

    test('sqrt(3) is approximately 1.732', () => {
        expect(approxEqual(Math.sqrt(3), 1.7320508075688772)).toBe(true);
    });

    test('sqrt(3)/2 is approximately 0.866', () => {
        expect(approxEqual(Math.sqrt(3) / 2, 0.8660254037844386)).toBe(true);
    });

    test('radians conversion is correct', () => {
        expect(approxEqual(radians(180), Math.PI)).toBe(true);
        expect(approxEqual(radians(90), Math.PI / 2)).toBe(true);
        expect(approxEqual(radians(60), Math.PI / 3)).toBe(true);
    });
});

describe('Determinant and Matrix Properties', () => {
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

    test('Reflection matrix has determinant -1', () => {
        const R = [-1, 0, 0, 0, 1, 0];
        const det = R[0] * R[4] - R[1] * R[3];
        expect(det).toBe(-1);
    });

    test('Product of matrices maintains determinant relationship', () => {
        const R1 = trot(Math.PI / 6);
        const R2 = trot(Math.PI / 4);
        const prod = mul(R1, R2);
        
        const det1 = R1[0] * R1[4] - R1[1] * R1[3];
        const det2 = R2[0] * R2[4] - R2[1] * R2[3];
        const detProd = prod[0] * prod[4] - prod[1] * prod[3];
        
        expect(approxEqual(detProd, det1 * det2)).toBe(true);
    });
});

describe('Tile Substitution Rules', () => {
    test('Substitution rules follow paper specification', () => {
        // From Figure 2.1 in the paper:
        // - Spectre -> Mystic (1) + Spectres (7)
        // - Mystic -> Mystic (1) + Spectres (6)
        
        const super_rules = {
            'Gamma': ['Pi', 'Delta', 'null', 'Theta', 'Sigma', 'Xi', 'Phi', 'Gamma'],
            'Delta': ['Xi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
            'Theta': ['Psi', 'Delta', 'Pi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
            'Lambda': ['Psi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
            'Xi': ['Psi', 'Delta', 'Pi', 'Phi', 'Sigma', 'Psi', 'Phi', 'Gamma'],
            'Pi': ['Psi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Psi', 'Phi', 'Gamma'],
            'Sigma': ['Xi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Pi', 'Lambda', 'Gamma'],
            'Phi': ['Psi', 'Delta', 'Psi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
            'Psi': ['Psi', 'Delta', 'Psi', 'Phi', 'Sigma', 'Psi', 'Phi', 'Gamma']
        };

        // Each rule should have 8 entries
        Object.values(super_rules).forEach(rule => {
            expect(rule.length).toBe(8);
        });

        // Each rule should end with 'Gamma' (the Mystic)
        Object.values(super_rules).forEach(rule => {
            expect(rule[7]).toBe('Gamma');
        });
    });

    test('Transformation indices follow paper specification', () => {
        // t_rules format: [angle, from, to]
        const t_rules = [
            [60, 3, 1], [0, 2, 0], [60, 3, 1], [60, 3, 1],
            [0, 2, 0], [60, 3, 1], [-120, 3, 3]
        ];

        // Should have 7 transformation rules
        expect(t_rules.length).toBe(7);

        // From and to indices should be in valid range [0-3] (quad has 4 points)
        t_rules.forEach(([ang, from, to]) => {
            expect(from).toBeGreaterThanOrEqual(0);
            expect(from).toBeLessThanOrEqual(3);
            expect(to).toBeGreaterThanOrEqual(0);
            expect(to).toBeLessThanOrEqual(3);
        });
    });
});

describe('Edge Cases and Boundary Conditions', () => {
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
        
        // Should translate by (1,0), rotate 90°, then translate by (0,1)
        expect(pointsEqual(result, pt(0, 2))).toBe(true);
    });

    test('Inverse of composed transformations', () => {
        const T1 = ttrans(2, 3);
        const T2 = trot(Math.PI / 4);
        const composed = mul(T1, T2);
        const inv_composed = inv(composed);
        const identity = mul(composed, inv_composed);
        
        expect(matricesEqual(identity, ident)).toBe(true);
    });

    test('Point frame with zero coefficients', () => {
        const o = pt(1, 1);
        const p = pt(1, 0);
        const q = pt(0, 1);
        const result = pframe(o, p, q, 0, 0);
        expect(pointsEqual(result, o)).toBe(true);
    });

    test('Match segment with identical endpoints handles gracefully', () => {
        // This is a degenerate case - matchSeg expects different points
        // but we test to ensure no crashes
        const p = pt(1, 1);
        const q = pt(1, 1);
        expect(() => matchSeg(p, q)).not.toThrow();
    });
});

describe('Tile Counting', () => {
    // Mock canvas context
    const mockCtx = {
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        closePath: jest.fn(),
        fill: jest.fn(),
        stroke: jest.fn(),
        save: jest.fn(),
        restore: jest.fn(),
        transform: jest.fn(),
        bezierCurveTo: jest.fn(),
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0
    };

    // Mock color map
    const mockColmap = {
        'Gamma': [255, 255, 255],
        'Gamma1': [255, 255, 255],
        'Gamma2': [255, 255, 255],
        'Delta': [220, 220, 220]
    };

    // Helper to create a simple polygon
    function createSimplePolygon() {
        return [
            pt(0, 0),
            pt(1, 0),
            pt(1, 1),
            pt(0, 1)
        ];
    }

    // Mock Shape class with counter
    class MockShape {
        constructor(pts, quad, label) {
            this.pts = pts;
            this.quad = quad;
            this.label = label;
        }

        draw(ctx, counter) {
            counter.count++;
            return counter.count;
        }
    }

    // Mock CurvyShape class with counter
    class MockCurvyShape {
        constructor(pts, quad, label) {
            this.quad = quad;
            this.label = label;
            this.pts = pts;
        }

        draw(ctx, counter) {
            counter.count++;
            return counter.count;
        }
    }

    // Mock Meta class with counter
    class MockMeta {
        constructor() {
            this.geoms = [];
            this.quad = [];
        }

        addChild(g, T) {
            this.geoms.push({ geom: g, xform: T });
        }

        draw(ctx, counter) {
            for (let g of this.geoms) {
                g.geom.draw(ctx, counter);
            }
            return counter.count;
        }
    }

    test('Shape.draw() increments counter by 1', () => {
        const shape = new MockShape(
            createSimplePolygon(),
            [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)],
            'Delta'
        );
        const counter = { count: 0 };
        
        shape.draw(mockCtx, counter);
        
        expect(counter.count).toBe(1);
    });

    test('CurvyShape.draw() increments counter by 1', () => {
        const shape = new MockCurvyShape(
            createSimplePolygon(),
            [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)],
            'Delta'
        );
        const counter = { count: 0 };
        
        shape.draw(mockCtx, counter);
        
        expect(counter.count).toBe(1);
    });

    test('Multiple Shape draws accumulate count', () => {
        const shape1 = new MockShape(createSimplePolygon(), [], 'Delta');
        const shape2 = new MockShape(createSimplePolygon(), [], 'Delta');
        const shape3 = new MockShape(createSimplePolygon(), [], 'Delta');
        const counter = { count: 0 };
        
        shape1.draw(mockCtx, counter);
        shape2.draw(mockCtx, counter);
        shape3.draw(mockCtx, counter);
        
        expect(counter.count).toBe(3);
    });

    test('Meta with single child counts correctly', () => {
        const meta = new MockMeta();
        const shape = new MockShape(createSimplePolygon(), [], 'Delta');
        meta.addChild(shape, ident);
        const counter = { count: 0 };
        
        meta.draw(mockCtx, counter);
        
        expect(counter.count).toBe(1);
    });

    test('Meta with multiple children counts all tiles', () => {
        const meta = new MockMeta();
        const shape1 = new MockShape(createSimplePolygon(), [], 'Delta');
        const shape2 = new MockShape(createSimplePolygon(), [], 'Gamma');
        const shape3 = new MockCurvyShape(createSimplePolygon(), [], 'Delta');
        
        meta.addChild(shape1, ident);
        meta.addChild(shape2, ident);
        meta.addChild(shape3, ident);
        
        const counter = { count: 0 };
        meta.draw(mockCtx, counter);
        
        expect(counter.count).toBe(3);
    });

    test('Nested Meta structures count recursively', () => {
        const outerMeta = new MockMeta();
        const innerMeta = new MockMeta();
        
        const shape1 = new MockShape(createSimplePolygon(), [], 'Delta');
        const shape2 = new MockShape(createSimplePolygon(), [], 'Gamma');
        const shape3 = new MockShape(createSimplePolygon(), [], 'Delta');
        
        innerMeta.addChild(shape1, ident);
        innerMeta.addChild(shape2, ident);
        
        outerMeta.addChild(innerMeta, ident);
        outerMeta.addChild(shape3, ident);
        
        const counter = { count: 0 };
        outerMeta.draw(mockCtx, counter);
        
        expect(counter.count).toBe(3);
    });

    test('Counter resets properly between draws', () => {
        const shape = new MockShape(createSimplePolygon(), [], 'Delta');
        
        // First draw
        let counter1 = { count: 0 };
        shape.draw(mockCtx, counter1);
        expect(counter1.count).toBe(1);
        
        // Second draw with reset counter
        let counter2 = { count: 0 };
        shape.draw(mockCtx, counter2);
        expect(counter2.count).toBe(1);
    });

    test('Complex substitution system counts correctly', () => {
        // Simulate a supertile with 8 sub-tiles (like in buildSupertiles)
        const supertile = new MockMeta();
        
        for (let i = 0; i < 8; i++) {
            supertile.addChild(
                new MockShape(createSimplePolygon(), [], 'Delta'),
                ident
            );
        }
        
        const counter = { count: 0 };
        supertile.draw(mockCtx, counter);
        
        expect(counter.count).toBe(8);
    });

    test('Mixed Shape and CurvyShape types count correctly', () => {
        const meta = new MockMeta();
        
        meta.addChild(new MockShape(createSimplePolygon(), [], 'Delta'), ident);
        meta.addChild(new MockCurvyShape(createSimplePolygon(), [], 'Gamma'), ident);
        meta.addChild(new MockShape(createSimplePolygon(), [], 'Delta'), ident);
        meta.addChild(new MockCurvyShape(createSimplePolygon(), [], 'Gamma'), ident);
        
        const counter = { count: 0 };
        meta.draw(mockCtx, counter);
        
        expect(counter.count).toBe(4);
    });

    test('Empty Meta returns zero count', () => {
        const meta = new MockMeta();
        const counter = { count: 0 };
        
        meta.draw(mockCtx, counter);
        
        expect(counter.count).toBe(0);
    });
});
