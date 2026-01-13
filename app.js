/**
 * Spectre Tile Interactive Visualization
 * 
 * An interactive app for exploring the Spectre tile, based on the paper
 * "A Chiral Aperiodic Monotile" by David Smith, Joseph Samuel Myers,
 * Craig S. Kaplan, and Chaim Goodman-Strauss.
 * 
 * This application uses p5.js for rendering and interaction.
 */

// =============================================================================
// CONSTANTS AND CONFIGURATION
// =============================================================================

const IDENTITY_MATRIX = [1, 0, 0, 0, 1, 0];
const MAX_GEN_LEVEL = 8; // Prevent memory crash by capping recursion

const TILE_NAMES = [
    'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi',
    'Pi', 'Sigma', 'Phi', 'Psi'
];

// Color schemes from various sources
const COLOR_SCHEMES = {
    // Color map from Figure 5.3
    figure53: {
        'Gamma': [203, 157, 126],
        'Gamma1': [203, 157, 126],
        'Gamma2': [203, 157, 126],
        'Delta': [163, 150, 133],
        'Theta': [208, 215, 150],
        'Lambda': [184, 205, 178],
        'Xi': [211, 177, 144],
        'Pi': [218, 197, 161],
        'Sigma': [191, 146, 126],
        'Phi': [228, 213, 167],
        'Psi': [224, 223, 156]
    },
    original: {
        'Gamma': [255, 255, 255],
        'Gamma1': [255, 255, 255],
        'Gamma2': [255, 255, 255],
        'Delta': [220, 220, 220],
        'Theta': [255, 191, 191],
        'Lambda': [255, 160, 122],
        'Xi': [255, 242, 0],
        'Pi': [135, 206, 250],
        'Sigma': [245, 245, 220],
        'Phi': [0, 255, 0],
        'Psi': [0, 255, 255]
    },
    mystics: {
        'Gamma': [196, 201, 169],
        'Gamma1': [196, 201, 169],
        'Gamma2': [156, 160, 116],
        'Delta': [247, 252, 248],
        'Theta': [247, 252, 248],
        'Lambda': [247, 252, 248],
        'Xi': [247, 252, 248],
        'Pi': [247, 252, 248],
        'Sigma': [247, 252, 248],
        'Phi': [247, 252, 248],
        'Psi': [247, 252, 248]
    },
    pride: {
        'Gamma': [255, 255, 255],
        'Gamma1': [97, 57, 21],
        'Gamma2': [0, 0, 0],
        'Delta': [2, 129, 33],
        'Theta': [0, 76, 255],
        'Lambda': [118, 0, 136],
        'Xi': [229, 0, 0],
        'Pi': [255, 175, 199],
        'Sigma': [115, 215, 238],
        'Phi': [255, 141, 0],
        'Psi': [255, 238, 0]
    },
    white: {
        'Gamma': [255, 255, 255],
        'Gamma1': [255, 255, 255],
        'Gamma2': [255, 255, 255],
        'Delta': [255, 255, 255],
        'Theta': [255, 255, 255],
        'Lambda': [255, 255, 255],
        'Xi': [255, 255, 255],
        'Pi': [255, 255, 255],
        'Sigma': [255, 255, 255],
        'Phi': [255, 255, 255],
        'Psi': [255, 255, 255]
    }
};

// =============================================================================
// STATE VARIABLES
// =============================================================================

let toScreenTransform = [20, 0, 0, 0, -20, 0];
let lineWeightScale = 1;
let tileSystem;
let generationLevel = 0;

// UI Elements
let tileSelector;
let shapeSelector;
let colorSchemeSelector;
let numberCheckbox;
let tileCountDisplay;

// Interaction State
let isDragging = false;
let showUIBox = true;
let drawCounter = 1;
let tilesDrawnCount = 0;

// Touch handling
let previousTouchDistance = -1;
let previousTouchCenter = null;

// Current color map
let currentColorMap = COLOR_SCHEMES.pride;

// =============================================================================
// GEOMETRIC UTILITIES
// =============================================================================

/**
 * Creates a 2D point
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {Object} Point object with x and y properties
 */
function createPoint(x, y) {
    return { x, y };
}

/**
 * Computes the inverse of an affine transformation matrix
 * @param {Array<number>} T - 6-element affine matrix [a, b, c, d, e, f]
 * @returns {Array<number>} Inverted matrix
 */
function invertMatrix(T) {
    const det = T[0] * T[4] - T[1] * T[3];
    return [
        T[4] / det,
        -T[1] / det,
        (T[1] * T[5] - T[2] * T[4]) / det,
        -T[3] / det,
        T[0] / det,
        (T[2] * T[3] - T[0] * T[5]) / det
    ];
}

/**
 * Multiplies two affine transformation matrices
 * @param {Array<number>} A - First matrix
 * @param {Array<number>} B - Second matrix
 * @returns {Array<number>} Product matrix
 */
function multiplyMatrices(A, B) {
    return [
        A[0] * B[0] + A[1] * B[3],
        A[0] * B[1] + A[1] * B[4],
        A[0] * B[2] + A[1] * B[5] + A[2],
        A[3] * B[0] + A[4] * B[3],
        A[3] * B[1] + A[4] * B[4],
        A[3] * B[2] + A[4] * B[5] + A[5]
    ];
}

/**
 * Adds two points
 * @param {Object} p - First point
 * @param {Object} q - Second point
 * @returns {Object} Sum of points
 */
function addPoints(p, q) {
    return { x: p.x + q.x, y: p.y + q.y };
}

/**
 * Subtracts two points
 * @param {Object} p - First point
 * @param {Object} q - Second point
 * @returns {Object} Difference of points
 */
function subtractPoints(p, q) {
    return { x: p.x - q.x, y: p.y - q.y };
}

/**
 * Computes a point in a coordinate frame
 * @param {Object} o - Origin
 * @param {Object} p - First basis vector
 * @param {Object} q - Second basis vector
 * @param {number} a - First coordinate
 * @param {number} b - Second coordinate
 * @returns {Object} Point in the frame
 */
function pointInFrame(o, p, q, a, b) {
    return {
        x: o.x + a * p.x + b * q.x,
        y: o.y + a * p.y + b * q.y
    };
}

/**
 * Creates a rotation matrix
 * @param {number} angle - Rotation angle in radians
 * @returns {Array<number>} Rotation matrix
 */
function rotationMatrix(angle) {
    const c = cos(angle);
    const s = sin(angle);
    return [c, -s, 0, s, c, 0];
}

/**
 * Creates a translation matrix
 * @param {number} tx - Translation in x
 * @param {number} ty - Translation in y
 * @returns {Array<number>} Translation matrix
 */
function translationMatrix(tx, ty) {
    return [1, 0, tx, 0, 1, ty];
}

/**
 * Creates a translation matrix from point p to point q
 * @param {Object} p - Starting point
 * @param {Object} q - Ending point
 * @returns {Array<number>} Translation matrix
 */
function translateTo(p, q) {
    return translationMatrix(q.x - p.x, q.y - p.y);
}

/**
 * Creates a rotation matrix about a point
 * @param {Object} p - Center of rotation
 * @param {number} angle - Rotation angle
 * @returns {Array<number>} Rotation matrix about the point
 */
function rotateAbout(p, angle) {
    return multiplyMatrices(
        translationMatrix(p.x, p.y),
        multiplyMatrices(rotationMatrix(angle), translationMatrix(-p.x, -p.y))
    );
}

/**
 * Transforms a point by a matrix
 * @param {Array<number>} M - Transformation matrix
 * @param {Object} P - Point to transform
 * @returns {Object} Transformed point
 */
function transformPoint(M, P) {
    return createPoint(
        M[0] * P.x + M[1] * P.y + M[2],
        M[3] * P.x + M[4] * P.y + M[5]
    );
}

/**
 * Checks if a bounding circle is visible on screen
 * @param {Array<number>} S - Object transformation matrix
 * @param {number} radius - Bounding radius
 * @returns {boolean} True if the object is on screen
 */
function isOnScreen(S, radius) {
    // Combine view transform and object transform
    const M = multiplyMatrices(toScreenTransform, S);
    
    // Transform center to screen space (relative to center of canvas)
    const centerRelative = transformPoint(M, { x: 0, y: 0 });
    
    // Actual screen coordinates (0,0 is top-left)
    const centerX = centerRelative.x + width / 2;
    const centerY = centerRelative.y + height / 2;
    
    // Scale the radius
    const scale = Math.hypot(M[0], M[1]);
    const screenRadius = radius * scale;
    
    // Check intersection with screen rectangle
    const closestX = Math.max(0, Math.min(width, centerX));
    const closestY = Math.max(0, Math.min(height, centerY));
    
    const dx = centerX - closestX;
    const dy = centerY - closestY;
    
    return (dx * dx + dy * dy) < (screenRadius * screenRadius);
}

/**
 * Draws a polygon with the given shape and transformation
 * @param {Array<Object>} shape - Array of points defining the polygon
 * @param {Array<number>} T - Transformation matrix
 * @param {Array<number>} fillColor - Fill color [r, g, b] or null
 * @param {Array<number>} strokeColor - Stroke color [r, g, b] or null
 * @param {number} weight - Stroke weight
 */
function drawPolygon(shape, T, fillColor, strokeColor, weight) {
    if (fillColor != null) {
        fill(...fillColor);
    } else {
        noFill();
    }
    
    if (strokeColor != null) {
        stroke(0);
        strokeWeight(weight);
    } else {
        noStroke();
    }
    
    beginShape();
    for (let p of shape) {
        const tp = transformPoint(T, p);
        vertex(tp.x, tp.y);
    }
    endShape(CLOSE);
}

// =============================================================================
// SHAPE CLASSES
// =============================================================================

/**
 * Basic polygonal shape class
 */
class Shape {
    /**
     * @param {Array<Object>} points - Vertices of the shape
     * @param {Array<Object>} quad - Quadrilateral key points
     * @param {string} label - Label for coloring
     */
    constructor(points, quad, label) {
        this.pts = points;
        this.quad = quad;
        this.label = label;
        this.calculateRadius();
    }

    /**
     * Calculates the bounding radius for culling
     */
    calculateRadius() {
        this.radius = 0;
        for (let p of this.pts) {
            const d = Math.hypot(p.x, p.y);
            if (d > this.radius) {
                this.radius = d;
            }
        }
    }

    /**
     * Draws the shape with the given transformation
     * @param {Array<number>} S - Transformation matrix
     */
    draw(S) {
        // Cull check - skip if not on screen
        if (!isOnScreen(S, this.radius)) {
            return;
        }

        drawPolygon(this.pts, S, currentColorMap[this.label], [0, 0, 0], 0.1);
        tilesDrawnCount++;

        // Draw tile numbers if enabled
        if (numberCheckbox && numberCheckbox.checked()) {
            this.drawTileNumber(S);
        }
    }

    /**
     * Draws the tile number at the center of the shape
     * @param {Array<number>} S - Transformation matrix
     */
    drawTileNumber(S) {
        let cx = 0, cy = 0;
        let count = 0;
        
        for (let p of this.pts) {
            const tp = transformPoint(S, p);
            cx += tp.x;
            cy += tp.y;
            count++;
        }
        
        cx /= count;
        cy /= count;

        fill(0);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(0.5);
        push();
        translate(cx, cy);
        scale(1, -1);
        text(drawCounter, 0, 0);
        pop();
        drawCounter++;
    }

    /**
     * Exports the shape to SVG format
     * @param {Array<number>} S - Transformation matrix
     * @param {Array<string>} stream - Output stream for SVG strings
     */
    streamSVG(S, stream) {
        let svgString = '<polygon points="';
        let isFirst = true;
        
        let cx = 0, cy = 0;
        let count = 0;

        for (let p of this.pts) {
            const sp = transformPoint(S, p);
            cx += sp.x;
            cy += sp.y;
            count++;

            if (!isFirst) {
                svgString += ' ';
            }
            svgString += `${sp.x},${sp.y}`;
            isFirst = false;
        }
        
        const col = currentColorMap[this.label];
        svgString += `" stroke="black" stroke-weight="0.1" fill="rgb(${col[0]},${col[1]},${col[2]})" />`;
        stream.push(svgString);

        if (numberCheckbox && numberCheckbox.checked()) {
            cx /= count;
            cy /= count;
            stream.push(`<text x="${cx}" y="${cy}" font-family="Arial" font-size="12" text-anchor="middle" fill="black">${drawCounter}</text>`);
            drawCounter++;
        }
    }
}

/**
 * Shape class with curved edges using Bezier curves
 */
class CurvyShape {
    /**
     * @param {Array<Object>} points - Vertices of the shape
     * @param {Array<Object>} quad - Quadrilateral key points
     * @param {string} label - Label for coloring
     */
    constructor(points, quad, label) {
        this.quad = quad;
        this.label = label;

        // Generate curved control points
        let alternateDirection = true;
        this.pts = [points[points.length - 1]];
        
        for (const p of points) {
            const prev = this.pts[this.pts.length - 1];
            const v = subtractPoints(p, prev);
            const w = createPoint(-v.y, v.x);
            
            const offset = alternateDirection ? 0.6 : -0.6;
            this.pts.push(pointInFrame(prev, v, w, 0.33, offset));
            this.pts.push(pointInFrame(prev, v, w, 0.67, offset));
            alternateDirection = !alternateDirection;
            this.pts.push(p);
        }
        
        this.calculateRadius();
    }

    /**
     * Calculates the bounding radius for culling
     */
    calculateRadius() {
        this.radius = 0;
        for (let p of this.pts) {
            const d = Math.hypot(p.x, p.y);
            if (d > this.radius) {
                this.radius = d;
            }
        }
    }

    /**
     * Draws the curved shape with the given transformation
     * @param {Array<number>} S - Transformation matrix
     */
    draw(S) {
        // Cull check
        if (!isOnScreen(S, this.radius)) {
            return;
        }

        fill(...currentColorMap[this.label]);
        strokeWeight(0.1);
        stroke(0);

        beginShape();
        const tp = transformPoint(S, this.pts[0]);
        vertex(tp.x, tp.y);

        for (let idx = 1; idx < this.pts.length; idx += 3) {
            const a = transformPoint(S, this.pts[idx]);
            const b = transformPoint(S, this.pts[idx + 1]);
            const c = transformPoint(S, this.pts[idx + 2]);
            bezierVertex(a.x, a.y, b.x, b.y, c.x, c.y);
        }
        
        endShape(CLOSE);
        tilesDrawnCount++;

        // Draw tile numbers if enabled
        if (numberCheckbox && numberCheckbox.checked()) {
            this.drawTileNumber(S);
        }
    }

    /**
     * Draws the tile number at the center of the shape
     * @param {Array<number>} S - Transformation matrix
     */
    drawTileNumber(S) {
        let cx = 0, cy = 0;
        let count = 0;
        
        for (let p of this.pts) {
            const tp = transformPoint(S, p);
            cx += tp.x;
            cy += tp.y;
            count++;
        }
        
        cx /= count;
        cy /= count;

        fill(0);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(0.5);
        push();
        translate(cx, cy);
        scale(1, -1);
        text(drawCounter, 0, 0);
        pop();
        drawCounter++;
    }

    /**
     * Exports the curved shape to SVG format
     * @param {Array<number>} S - Transformation matrix
     * @param {Array<string>} stream - Output stream for SVG strings
     */
    streamSVG(S, stream) {
        const tp = transformPoint(S, this.pts[0]);
        let cx = tp.x, cy = tp.y;
        let count = 1;

        let svgString = `<path d="M ${tp.x} ${tp.y}`;

        for (let idx = 1; idx < this.pts.length; idx += 3) {
            const a = transformPoint(S, this.pts[idx]);
            const b = transformPoint(S, this.pts[idx + 1]);
            const c = transformPoint(S, this.pts[idx + 2]);

            cx += a.x + b.x + c.x;
            cy += a.y + b.y + c.y;
            count += 3;

            svgString += ` C ${a.x} ${a.y} ${b.x} ${b.y} ${c.x} ${c.y}`;
        }
        
        const col = currentColorMap[this.label];
        svgString += `" stroke="black" stroke-weight="0.1" fill="rgb(${col[0]},${col[1]},${col[2]})" />`;
        stream.push(svgString);

        if (numberCheckbox && numberCheckbox.checked()) {
            cx /= count;
            cy /= count;
            stream.push(`<text x="${cx}" y="${cy}" font-family="Arial" font-size="12" text-anchor="middle" fill="black">${drawCounter}</text>`);
            drawCounter++;
        }
    }
}

/**
 * Meta-tile composed of multiple sub-tiles
 */
class MetaTile {
    constructor() {
        this.geoms = [];
        this.quad = [];
        this.radius = 0;
    }

    /**
     * Adds a child geometry with a transformation
     * @param {Object} geometry - Shape or MetaTile to add
     * @param {Array<number>} transform - Transformation matrix
     */
    addChild(geometry, transform) {
        this.geoms.push({ geom: geometry, xform: transform });
    }
    
    /**
     * Calculates the bounding radius for culling
     */
    calculateRadius() {
        this.radius = 0;
        for (let g of this.geoms) {
            const p = transformPoint(g.xform, { x: 0, y: 0 });
            const d = Math.hypot(p.x, p.y);
            const r = d + g.geom.radius;
            if (r > this.radius) {
                this.radius = r;
            }
        }
    }

    /**
     * Draws all child geometries
     * @param {Array<number>} S - Transformation matrix
     */
    draw(S) {
        // Cull check
        if (!isOnScreen(S, this.radius)) {
            return;
        }

        for (let g of this.geoms) {
            g.geom.draw(multiplyMatrices(S, g.xform));
        }
    }

    /**
     * Exports the meta-tile to SVG format
     * @param {Array<number>} S - Transformation matrix
     * @param {Array<string>} stream - Output stream for SVG strings
     */
    streamSVG(S, stream) {
        for (let g of this.geoms) {
            g.geom.streamSVG(multiplyMatrices(S, g.xform), stream);
        }
    }
}

// =============================================================================
// TILE CONSTRUCTION FUNCTIONS
// =============================================================================

/**
 * Builds the base Spectre tile system
 * @param {boolean} curved - Whether to use curved edges
 * @returns {Object} Dictionary of tile shapes
 */
function buildSpectreBase(curved = false) {
    const spectre = [
        createPoint(0, 0),
        createPoint(1.0, 0.0),
        createPoint(1.5, -0.8660254037844386),
        createPoint(2.366025403784439, -0.36602540378443865),
        createPoint(2.366025403784439, 0.6339745962155614),
        createPoint(3.366025403784439, 0.6339745962155614),
        createPoint(3.866025403784439, 1.5),
        createPoint(3.0, 2.0),
        createPoint(2.133974596215561, 1.5),
        createPoint(1.6339745962155614, 2.3660254037844393),
        createPoint(0.6339745962155614, 2.3660254037844393),
        createPoint(-0.3660254037844386, 2.3660254037844393),
        createPoint(-0.866025403784439, 1.5),
        createPoint(0.0, 1.0)
    ];

    const spectreKeys = [
        spectre[3], spectre[5], spectre[7], spectre[11]
    ];

    const tiles = {};
    const ShapeClass = curved ? CurvyShape : Shape;

    // Create base tiles
    for (let label of ['Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi']) {
        tiles[label] = new ShapeClass(spectre, spectreKeys, label);
    }

    // Create the mystic (Gamma) tile
    const mystic = new MetaTile();
    mystic.addChild(
        new ShapeClass(spectre, spectreKeys, 'Gamma1'),
        IDENTITY_MATRIX
    );
    mystic.addChild(
        new ShapeClass(spectre, spectreKeys, 'Gamma2'),
        multiplyMatrices(translationMatrix(spectre[8].x, spectre[8].y), rotationMatrix(PI / 6))
    );
    mystic.quad = spectreKeys;
    mystic.calculateRadius();
    tiles['Gamma'] = mystic;

    return tiles;
}

/**
 * Builds the Hat and Turtle tile system
 * @param {boolean} hatDominant - Whether Hat or Turtle is dominant
 * @returns {Object} Dictionary of tile shapes
 */
function buildHatTurtleBase(hatDominant) {
    const sqrt3 = 1.7320508075688772;
    const halfSqrt3 = 0.8660254037844386;

    function hexPoint(x, y) {
        return createPoint(x + 0.5 * y, -halfSqrt3 * y);
    }

    const hat = [
        hexPoint(-1, 2), hexPoint(0, 2), hexPoint(0, 3), hexPoint(2, 2),
        hexPoint(3, 0), hexPoint(4, 0), hexPoint(5, -1), hexPoint(4, -2),
        hexPoint(2, -1), hexPoint(2, -2), hexPoint(1, -2), hexPoint(0, -2),
        hexPoint(-1, -1), hexPoint(0, 0)
    ];

    const turtle = [
        hexPoint(0, 0), hexPoint(2, -1), hexPoint(3, 0), hexPoint(4, -1),
        hexPoint(4, -2), hexPoint(6, -3), hexPoint(7, -5), hexPoint(6, -5),
        hexPoint(5, -4), hexPoint(4, -5), hexPoint(2, -4), hexPoint(0, -3),
        hexPoint(-1, -1), hexPoint(0, -1)
    ];

    const hatKeys = [hat[3], hat[5], hat[7], hat[11]];
    const turtleKeys = [turtle[3], turtle[5], turtle[7], turtle[11]];

    const tiles = {};

    if (hatDominant) {
        for (let label of ['Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi']) {
            tiles[label] = new Shape(hat, hatKeys, label);
        }

        const mystic = new MetaTile();
        mystic.addChild(new Shape(hat, hatKeys, 'Gamma1'), IDENTITY_MATRIX);
        mystic.addChild(
            new Shape(turtle, turtleKeys, 'Gamma2'),
            translationMatrix(hat[8].x, hat[8].y)
        );
        mystic.quad = hatKeys;
        mystic.calculateRadius();
        tiles['Gamma'] = mystic;
    } else {
        for (let label of ['Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi']) {
            tiles[label] = new Shape(turtle, turtleKeys, label);
        }

        const mystic = new MetaTile();
        mystic.addChild(new Shape(turtle, turtleKeys, 'Gamma1'), IDENTITY_MATRIX);
        mystic.addChild(
            new Shape(hat, hatKeys, 'Gamma2'),
            multiplyMatrices(translationMatrix(turtle[9].x, turtle[9].y), rotationMatrix(PI / 3))
        );
        mystic.quad = turtleKeys;
        mystic.calculateRadius();
        tiles['Gamma'] = mystic;
    }

    return tiles;
}

/**
 * Builds a simple hexagonal tile system
 * @returns {Object} Dictionary of tile shapes
 */
function buildHexBase() {
    const halfSqrt3 = 0.8660254037844386;

    const hex = [
        createPoint(0, 0),
        createPoint(1.0, 0.0),
        createPoint(1.5, halfSqrt3),
        createPoint(1, 2 * halfSqrt3),
        createPoint(0, 2 * halfSqrt3),
        createPoint(-0.5, halfSqrt3)
    ];

    const hexKeys = [hex[1], hex[2], hex[3], hex[5]];
    const tiles = {};

    for (let label of ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi']) {
        tiles[label] = new Shape(hex, hexKeys, label);
    }

    return tiles;
}

/**
 * Builds supertiles from a base tile system
 * @param {Object} sys - Base tile system
 * @returns {Object} Supertile system
 */
function buildSupertiles(sys) {
    const quad = sys['Delta'].quad;
    const reflectionMatrix = [-1, 0, 0, 0, 1, 0];

    const tileRules = [
        [60, 3, 1], [0, 2, 0], [60, 3, 1], [60, 3, 1],
        [0, 2, 0], [60, 3, 1], [-120, 3, 3]
    ];

    // Build transformation matrices
    const transforms = [IDENTITY_MATRIX];
    let totalAngle = 0;
    let rotation = IDENTITY_MATRIX;
    const transformedQuad = [...quad];
    
    for (const [angle, from, to] of tileRules) {
        totalAngle += angle;
        if (angle !== 0) {
            rotation = rotationMatrix(radians(totalAngle));
            for (let i = 0; i < 4; ++i) {
                transformedQuad[i] = transformPoint(rotation, quad[i]);
            }
        }

        const translation = translateTo(
            transformedQuad[to],
            transformPoint(transforms[transforms.length - 1], quad[from])
        );
        transforms.push(multiplyMatrices(translation, rotation));
    }

    // Apply reflection to all transforms
    for (let idx = 0; idx < transforms.length; ++idx) {
        transforms[idx] = multiplyMatrices(reflectionMatrix, transforms[idx]);
    }

    // Substitution rules for supertiles
    const superRules = {
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
    
    const superQuad = [
        transformPoint(transforms[6], quad[2]),
        transformPoint(transforms[5], quad[1]),
        transformPoint(transforms[3], quad[2]),
        transformPoint(transforms[0], quad[1])
    ];

    const supertiles = {};

    for (const [label, substitutions] of Object.entries(superRules)) {
        const superTile = new MetaTile();
        for (let idx = 0; idx < 8; ++idx) {
            if (substitutions[idx] === 'null') {
                continue;
            }
            superTile.addChild(sys[substitutions[idx]], transforms[idx]);
        }
        superTile.quad = superQuad;
        superTile.calculateRadius();
        supertiles[label] = superTile;
    }

    return supertiles;
}

// =============================================================================
// P5.JS LIFECYCLE FUNCTIONS
// =============================================================================

/**
 * p5.js setup function - initializes the canvas and UI
 */
function setup() {
    const canvas = createCanvas(windowWidth, windowHeight);
    canvas.elt.style.touchAction = "none";

    tileSystem = buildSpectreBase();

    // Create UI elements
    createUIElements();
}

/**
 * Creates all UI control elements
 */
function createUIElements() {
    // Shapes selector
    let label = createSpan('Shapes');
    label.position(10, 10);
    label.size(125, 15);

    shapeSelector = createSelect();
    shapeSelector.position(10, 30);
    shapeSelector.size(125, 25);
    shapeSelector.option('Tile(1,1)');
    shapeSelector.option('Spectres');
    shapeSelector.option('Hexagons');
    shapeSelector.option('Turtles in Hats');
    shapeSelector.option('Hats in Turtles');
    shapeSelector.changed(handleShapeChange);

    // Tile count display
    label = createSpan('Tiles in View:');
    label.position(10, 60);
    label.size(125, 15);
    
    tileCountDisplay = createSpan('0');
    tileCountDisplay.position(10, 80);
    tileCountDisplay.style('font-size', '16px');
    tileCountDisplay.style('font-weight', 'bold');

    // Category selector
    label = createSpan('Category');
    label.position(10, 110);
    label.size(125, 15);

    tileSelector = createSelect();
    tileSelector.position(10, 130);
    tileSelector.size(125, 25);
    for (let name of TILE_NAMES) {
        tileSelector.option(name);
    }
    tileSelector.value('Delta');
    tileSelector.changed(loop);

    // Color scheme selector
    label = createSpan('Colours');
    label.position(10, 160);
    label.size(125, 15);

    colorSchemeSelector = createSelect();
    colorSchemeSelector.position(10, 180);
    colorSchemeSelector.size(125, 25);
    colorSchemeSelector.option('Pride');
    colorSchemeSelector.option('Mystics');
    colorSchemeSelector.option('Figure 5.3');
    colorSchemeSelector.option('Bright');
    colorSchemeSelector.option('White');
    colorSchemeSelector.changed(loop);

    // Save PNG button
    const savePngButton = createButton("Save PNG");
    savePngButton.position(10, 220);
    savePngButton.size(125, 25);
    savePngButton.mousePressed(handleSavePNG);

    // Save SVG button
    const saveSvgButton = createButton("Save SVG");
    saveSvgButton.position(10, 250);
    saveSvgButton.size(125, 25);
    saveSvgButton.mousePressed(handleSaveSVG);

    // Number tiles checkbox
    numberCheckbox = createCheckbox('Number Tiles', false);
    numberCheckbox.position(10, 290);
    numberCheckbox.changed(loop);
}

/**
 * Handles shape selection change
 */
function handleShapeChange() {
    const selectedShape = shapeSelector.value();
    
    if (selectedShape === 'Hexagons') {
        tileSystem = buildHexBase();
    } else if (selectedShape === 'Turtles in Hats') {
        tileSystem = buildHatTurtleBase(true);
    } else if (selectedShape === 'Hats in Turtles') {
        tileSystem = buildHatTurtleBase(false);
    } else if (selectedShape === 'Spectres') {
        tileSystem = buildSpectreBase(true);
    } else {
        tileSystem = buildSpectreBase(false);
    }
    
    toScreenTransform = [20, 0, 0, 0, -20, 0];
    lineWeightScale = 1;
    generationLevel = 0;
    loop();
}

/**
 * Handles PNG save button press
 */
function handleSavePNG() {
    showUIBox = false;
    draw();
    save("output.png");
    showUIBox = true;
    draw();
}

/**
 * Handles SVG save button press
 */
function handleSaveSVG() {
    const stream = [];
    stream.push(`<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`);
    stream.push(`<g transform="translate(${width / 2},${height / 2})">`);

    drawCounter = 1;
    tileSystem[tileSelector.value()].streamSVG(toScreenTransform, stream);

    stream.push('</g>');
    stream.push('</svg>');

    saveStrings(stream, 'output', 'svg');
}

/**
 * p5.js draw function - renders the current view
 */
function draw() {
    background(255);

    // Auto-expansion logic: expand tiles if viewport exceeds current tile radius
    autoExpandTiles();

    push();
    translate(width / 2, height / 2);

    applyMatrix(
        toScreenTransform[0], toScreenTransform[3],
        toScreenTransform[1], toScreenTransform[4],
        toScreenTransform[2], toScreenTransform[5]
    );

    // Update color scheme
    updateColorScheme();

    // Draw tiles
    drawCounter = 1;
    tilesDrawnCount = 0;
    tileSystem[tileSelector.value()].draw(IDENTITY_MATRIX);

    pop();

    // Update tile count display
    if (tileCountDisplay) {
        tileCountDisplay.html(tilesDrawnCount);
    }

    // Draw UI box
    if (showUIBox) {
        stroke(0);
        strokeWeight(0.5);
        fill(255, 220);
        rect(5, 5, 135, 335);
    }
    
    noLoop();
}

/**
 * Automatically expands the tile system if needed
 */
function autoExpandTiles() {
    const inverseTransform = invertMatrix(toScreenTransform);
    
    // Calculate screen corners in world space
    const corners = [
        createPoint(-width / 2, -height / 2),
        createPoint(width / 2, -height / 2),
        createPoint(width / 2, height / 2),
        createPoint(-width / 2, height / 2)
    ];
    
    let maxDistance = 0;
    for (let corner of corners) {
        const worldPoint = transformPoint(inverseTransform, corner);
        const distance = Math.hypot(worldPoint.x, worldPoint.y);
        if (distance > maxDistance) {
            maxDistance = distance;
        }
    }
    
    // Expand if necessary
    let currentTile = tileSystem[tileSelector.value()];
    let loopGuard = 0;
    
    while (currentTile.radius < maxDistance && 
           generationLevel < MAX_GEN_LEVEL && 
           loopGuard < 5) {
        tileSystem = buildSupertiles(tileSystem);
        generationLevel++;
        currentTile = tileSystem[tileSelector.value()];
        loopGuard++;
    }
}

/**
 * Updates the current color scheme based on selector
 */
function updateColorScheme() {
    const scheme = colorSchemeSelector.value();
    
    if (scheme === 'Figure 5.3') {
        currentColorMap = COLOR_SCHEMES.figure53;
    } else if (scheme === 'Bright') {
        currentColorMap = COLOR_SCHEMES.original;
    } else if (scheme === 'Pride') {
        currentColorMap = COLOR_SCHEMES.pride;
    } else if (scheme === 'White') {
        currentColorMap = COLOR_SCHEMES.white;
    } else {
        currentColorMap = COLOR_SCHEMES.mystics;
    }
}

/**
 * p5.js window resize handler
 */
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

// =============================================================================
// INTERACTION HANDLERS
// =============================================================================

/**
 * Mouse wheel handler for zooming
 */
function mouseWheel(event) {
    const zoom = event.delta > 0 ? 0.9 : 1.1;
    const mx = mouseX - width / 2;
    const my = mouseY - height / 2;
    const t1 = translationMatrix(mx, my);
    const scale = [zoom, 0, 0, 0, zoom, 0];
    const t2 = translationMatrix(-mx, -my);
    const operation = multiplyMatrices(t1, multiplyMatrices(scale, t2));
    toScreenTransform = multiplyMatrices(operation, toScreenTransform);
    loop();
    return false;
}

/**
 * Mouse press handler
 */
function mousePressed() {
    // Ignore if clicking on UI
    if (mouseX < 150 && mouseY < 350) {
        return;
    }
    isDragging = true;
    loop();
}

/**
 * Mouse drag handler for panning
 */
function mouseDragged() {
    if (isDragging && touches.length < 2) {
        toScreenTransform = multiplyMatrices(
            translationMatrix(mouseX - pmouseX, mouseY - pmouseY),
            toScreenTransform
        );
        loop();
        return false;
    }
}

/**
 * Mouse release handler
 */
function mouseReleased() {
    isDragging = false;
    loop();
}

/**
 * Touch start handler
 */
function touchStarted() {
    // Ignore if touching UI
    if (mouseX < 150 && mouseY < 350) {
        return;
    }
    
    if (touches.length === 2) {
        previousTouchDistance = dist(touches[0].x, touches[0].y, touches[1].x, touches[1].y);
        previousTouchCenter = createPoint(
            (touches[0].x + touches[1].x) / 2,
            (touches[0].y + touches[1].y) / 2
        );
    }
    return false;
}

/**
 * Touch move handler for pinch-zoom and pan
 */
function touchMoved() {
    // Ignore if touching UI
    if (mouseX < 150 && mouseY < 350) {
        return;
    }
    
    if (touches.length === 2) {
        const currentDistance = dist(touches[0].x, touches[0].y, touches[1].x, touches[1].y);
        const currentCenter = createPoint(
            (touches[0].x + touches[1].x) / 2,
            (touches[0].y + touches[1].y) / 2
        );

        if (previousTouchDistance > 0) {
            const scale = currentDistance / previousTouchDistance;
            const centerXPrev = previousTouchCenter.x - width / 2;
            const centerYPrev = previousTouchCenter.y - height / 2;
            const centerXCurr = currentCenter.x - width / 2;
            const centerYCurr = currentCenter.y - height / 2;

            const tNew = translationMatrix(centerXCurr, centerYCurr);
            const scaleMatrix = [scale, 0, 0, 0, scale, 0];
            const tOld = translationMatrix(-centerXPrev, -centerYPrev);

            const operation = multiplyMatrices(tNew, multiplyMatrices(scaleMatrix, tOld));
            toScreenTransform = multiplyMatrices(operation, toScreenTransform);
        }

        previousTouchDistance = currentDistance;
        previousTouchCenter = currentCenter;
        loop();
        return false;
    }
    return false;
}

/**
 * Touch end handler
 */
function touchEnded() {
    if (touches.length < 2) {
        previousTouchDistance = -1;
        previousTouchCenter = null;
    }
    return false;
}
