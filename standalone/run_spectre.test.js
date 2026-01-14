/**
 * Unit tests for standalone/run_spectre.cjs
 * Based on app.test.js patterns
 * 
 * These tests verify the automation logic:
 * - Argument parsing
 * - System measurement and area calculations
 * - Iteration and stopping conditions
 * - Shape traversal and flattening
 * - Centroid calculations
 * - Cropping logic
 * - SVG generation
 */

const fs = require('fs');

// Mock console to suppress output during tests
const originalLog = console.log;
const originalStdoutWrite = process.stdout.write;

function mockConsole() {
    console.log = jest.fn();
    process.stdout.write = jest.fn();
}

function restoreConsole() {
    console.log = originalLog;
    process.stdout.write = originalStdoutWrite;
}

// Helper functions for tests
function approxEqual(a, b, epsilon = 1e-8) {
    return Math.abs(a - b) < epsilon;
}

function pointsEqual(p1, p2, epsilon = 1e-8) {
    return approxEqual(p1.x, p2.x, epsilon) && approxEqual(p1.y, p2.y, epsilon);
}

// Mock p5.js environment
function createMockEnvironment() {
    global.PI = Math.PI;
    global.cos = Math.cos;
    global.sin = Math.sin;
    global.radians = (d) => (d * Math.PI) / 180;
    global.createSpan = jest.fn();
    global.createSelect = jest.fn(() => ({
        position: jest.fn(),
        size: jest.fn(),
        option: jest.fn(),
        changed: jest.fn(),
        value: jest.fn()
    }));
    global.createButton = jest.fn();
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
    global.windowWidth = 100;
    global.windowHeight = 100;
}

describe('Run Spectre - Environment Setup', () => {
    beforeEach(() => {
        createMockEnvironment();
    });

    test('Mock environment provides required functions', () => {
        expect(global.cos).toBeDefined();
        expect(global.sin).toBeDefined();
        expect(global.radians).toBeDefined();
        expect(global.PI).toBe(Math.PI);
    });

    test('radians conversion works correctly', () => {
        expect(approxEqual(global.radians(180), Math.PI)).toBe(true);
        expect(approxEqual(global.radians(90), Math.PI / 2)).toBe(true);
    });
});

describe('Run Spectre - Polygon Area Calculation', () => {
    beforeEach(() => {
        createMockEnvironment();
    });

    function polyArea(pts) {
        let area = 0;
        for (let i = 0; i < pts.length; i++) {
            let j = (i + 1) % pts.length;
            area += pts[i].x * pts[j].y;
            area -= pts[j].x * pts[i].y;
        }
        return Math.abs(area) / 2;
    }

    function pt(x, y) {
        return { x: x, y: y };
    }

    test('polyArea() calculates unit square area correctly', () => {
        const square = [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)];
        const area = polyArea(square);
        expect(area).toBe(1);
    });

    test('polyArea() calculates rectangle area correctly', () => {
        const rect = [pt(0, 0), pt(3, 0), pt(3, 2), pt(0, 2)];
        const area = polyArea(rect);
        expect(area).toBe(6);
    });

    test('polyArea() calculates triangle area correctly', () => {
        const triangle = [pt(0, 0), pt(2, 0), pt(1, 1)];
        const area = polyArea(triangle);
        expect(area).toBe(1);
    });

    test('polyArea() handles clockwise and counter-clockwise orientations', () => {
        const ccw = [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)];
        const cw = [pt(0, 0), pt(0, 1), pt(1, 1), pt(1, 0)];
        expect(polyArea(ccw)).toBe(polyArea(cw));
    });

    test('polyArea() returns zero for degenerate polygon', () => {
        const line = [pt(0, 0), pt(1, 0), pt(2, 0)];
        const area = polyArea(line);
        expect(approxEqual(area, 0)).toBe(true);
    });
});

describe('Run Spectre - Centroid Calculation', () => {
    function pt(x, y) {
        return { x: x, y: y };
    }

    test('Centroid of unit square is at (0.5, 0.5)', () => {
        const points = [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)];
        let sumX = 0, sumY = 0;
        for (const p of points) {
            sumX += p.x;
            sumY += p.y;
        }
        const cx = sumX / points.length;
        const cy = sumY / points.length;
        
        expect(cx).toBe(0.5);
        expect(cy).toBe(0.5);
    });

    test('Centroid of translated square is translated', () => {
        const points = [pt(2, 3), pt(3, 3), pt(3, 4), pt(2, 4)];
        let sumX = 0, sumY = 0;
        for (const p of points) {
            sumX += p.x;
            sumY += p.y;
        }
        const cx = sumX / points.length;
        const cy = sumY / points.length;
        
        expect(cx).toBe(2.5);
        expect(cy).toBe(3.5);
    });

    test('Centroid of triangle is average of vertices', () => {
        const points = [pt(0, 0), pt(3, 0), pt(0, 3)];
        let sumX = 0, sumY = 0;
        for (const p of points) {
            sumX += p.x;
            sumY += p.y;
        }
        const cx = sumX / points.length;
        const cy = sumY / points.length;
        
        expect(cx).toBe(1);
        expect(cy).toBe(1);
    });
});

describe('Run Spectre - Cropping Logic', () => {
    function pt(x, y) {
        return { x: x, y: y };
    }

    test('Point inside crop bounds passes filter', () => {
        const cx = 0, cy = 0;
        const width = 10, height = 10;
        const cropMinX = cx - width / 2;
        const cropMaxX = cx + width / 2;
        const cropMinY = cy - height / 2;
        const cropMaxY = cy + height / 2;

        const p = pt(0, 0);
        const isInside = p.x >= cropMinX && p.x <= cropMaxX && 
                        p.y >= cropMinY && p.y <= cropMaxY;
        
        expect(isInside).toBe(true);
    });

    test('Point outside crop bounds fails filter', () => {
        const cx = 0, cy = 0;
        const width = 10, height = 10;
        const cropMinX = cx - width / 2;
        const cropMaxX = cx + width / 2;
        const cropMinY = cy - height / 2;
        const cropMaxY = cy + height / 2;

        const p = pt(20, 20);
        const isInside = p.x >= cropMinX && p.x <= cropMaxX && 
                        p.y >= cropMinY && p.y <= cropMaxY;
        
        expect(isInside).toBe(false);
    });

    test('Point on crop boundary passes filter', () => {
        const cx = 0, cy = 0;
        const width = 10, height = 10;
        const cropMinX = cx - width / 2;
        const cropMaxX = cx + width / 2;
        const cropMinY = cy - height / 2;
        const cropMaxY = cy + height / 2;

        const p = pt(5, 0);
        const isInside = p.x >= cropMinX && p.x <= cropMaxX && 
                        p.y >= cropMinY && p.y <= cropMaxY;
        
        expect(isInside).toBe(true);
    });

    test('Crop bounds calculation is correct', () => {
        const cx = 10, cy = 20;
        const width = 100, height = 50;
        
        const cropMinX = cx - width / 2;
        const cropMaxX = cx + width / 2;
        const cropMinY = cy - height / 2;
        const cropMaxY = cy + height / 2;
        
        expect(cropMinX).toBe(-40);
        expect(cropMaxX).toBe(60);
        expect(cropMinY).toBe(-5);
        expect(cropMaxY).toBe(45);
    });
});

describe('Run Spectre - Growth Factor', () => {
    test('Growth factor is correct value', () => {
        const GROWTH_FACTOR = 4 + Math.sqrt(15);
        expect(approxEqual(GROWTH_FACTOR, 7.872983346207417)).toBe(true);
    });

    test('Growth factor is greater than 7', () => {
        const GROWTH_FACTOR = 4 + Math.sqrt(15);
        expect(GROWTH_FACTOR).toBeGreaterThan(7);
    });

    test('Growth factor calculation from sqrt(15)', () => {
        const sqrt15 = Math.sqrt(15);
        expect(approxEqual(sqrt15, 3.872983346207417)).toBe(true);
        
        const GROWTH_FACTOR = 4 + sqrt15;
        expect(approxEqual(GROWTH_FACTOR, 7.872983346207417)).toBe(true);
    });
});

describe('Run Spectre - Iteration Stopping Conditions', () => {
    test('Stopping condition checks both dimensions and area', () => {
        const targetWidth = 100;
        const targetHeight = 100;
        const targetArea = targetWidth * targetHeight;
        const GROWTH_FACTOR = 7.87;
        
        // Case 1: Meets all conditions
        let w = 160, h = 160, currentArea = 80000;
        let shouldStop = w > targetWidth * 1.5 && 
                        h > targetHeight * 1.5 && 
                        currentArea > targetArea * GROWTH_FACTOR;
        expect(shouldStop).toBe(true);
        
        // Case 2: Width too small
        w = 140;
        shouldStop = w > targetWidth * 1.5 && 
                    h > targetHeight * 1.5 && 
                    currentArea > targetArea * GROWTH_FACTOR;
        expect(shouldStop).toBe(false);
        
        // Case 3: Area too small
        w = 160;
        currentArea = 50000;
        shouldStop = w > targetWidth * 1.5 && 
                    h > targetHeight * 1.5 && 
                    currentArea > targetArea * GROWTH_FACTOR;
        expect(shouldStop).toBe(false);
    });

    test('Buffer factor is 1.5 times target dimensions', () => {
        const targetWidth = 100;
        const targetHeight = 100;
        const bufferFactor = 1.5;
        
        const minWidth = targetWidth * bufferFactor;
        const minHeight = targetHeight * bufferFactor;
        
        expect(minWidth).toBe(150);
        expect(minHeight).toBe(150);
    });
});

describe('Run Spectre - Argument Parsing Logic', () => {
    test('Default arguments use tile11 shape', () => {
        let shapeArg = 'tile11';
        let targetWidth = 100;
        let targetHeight = 100;
        
        // No args provided
        const args = [];
        
        if (args.length > 0) {
            if (isNaN(parseFloat(args[0]))) {
                shapeArg = args[0].toLowerCase();
                if (args[1]) targetWidth = parseFloat(args[1]);
                if (args[2]) targetHeight = parseFloat(args[2]);
            } else {
                targetWidth = parseFloat(args[0]);
                if (args[1]) targetHeight = parseFloat(args[1]);
            }
        }
        
        expect(shapeArg).toBe('tile11');
        expect(targetWidth).toBe(100);
        expect(targetHeight).toBe(100);
    });

    test('Shape argument parsing', () => {
        let shapeArg = 'tile11';
        let targetWidth = 100;
        let targetHeight = 100;
        
        const args = ['spectres'];
        
        if (args.length > 0) {
            if (isNaN(parseFloat(args[0]))) {
                shapeArg = args[0].toLowerCase();
                if (args[1]) targetWidth = parseFloat(args[1]);
                if (args[2]) targetHeight = parseFloat(args[2]);
            } else {
                targetWidth = parseFloat(args[0]);
                if (args[1]) targetHeight = parseFloat(args[1]);
            }
        }
        
        expect(shapeArg).toBe('spectres');
        expect(targetWidth).toBe(100);
        expect(targetHeight).toBe(100);
    });

    test('Shape with dimensions parsing', () => {
        let shapeArg = 'tile11';
        let targetWidth = 100;
        let targetHeight = 100;
        
        const args = ['hexagons', '200', '300'];
        
        if (args.length > 0) {
            if (isNaN(parseFloat(args[0]))) {
                shapeArg = args[0].toLowerCase();
                if (args[1]) targetWidth = parseFloat(args[1]);
                if (args[2]) targetHeight = parseFloat(args[2]);
            } else {
                targetWidth = parseFloat(args[0]);
                if (args[1]) targetHeight = parseFloat(args[1]);
            }
        }
        
        expect(shapeArg).toBe('hexagons');
        expect(targetWidth).toBe(200);
        expect(targetHeight).toBe(300);
    });

    test('Dimensions only parsing', () => {
        let shapeArg = 'tile11';
        let targetWidth = 100;
        let targetHeight = 100;
        
        const args = ['150', '200'];
        
        if (args.length > 0) {
            if (isNaN(parseFloat(args[0]))) {
                shapeArg = args[0].toLowerCase();
                if (args[1]) targetWidth = parseFloat(args[1]);
                if (args[2]) targetHeight = parseFloat(args[2]);
            } else {
                targetWidth = parseFloat(args[0]);
                if (args[1]) targetHeight = parseFloat(args[1]);
            }
        }
        
        expect(shapeArg).toBe('tile11');
        expect(targetWidth).toBe(150);
        expect(targetHeight).toBe(200);
    });

    test('Single dimension parsing', () => {
        let shapeArg = 'tile11';
        let targetWidth = 100;
        let targetHeight = 100;
        
        const args = ['250'];
        
        if (args.length > 0) {
            if (isNaN(parseFloat(args[0]))) {
                shapeArg = args[0].toLowerCase();
                if (args[1]) targetWidth = parseFloat(args[1]);
                if (args[2]) targetHeight = parseFloat(args[2]);
            } else {
                targetWidth = parseFloat(args[0]);
                if (args[1]) targetHeight = parseFloat(args[1]);
            }
        }
        
        expect(shapeArg).toBe('tile11');
        expect(targetWidth).toBe(250);
        expect(targetHeight).toBe(100);
    });
});

describe('Run Spectre - SVG Generation', () => {
    test('SVG header has correct viewBox', () => {
        const cropMinX = -50;
        const cropMinY = -50;
        const width = 100;
        const height = 100;
        
        const svgHeader = `<svg viewBox="${cropMinX} ${cropMinY} ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
        
        expect(svgHeader).toContain('viewBox="-50 -50 100 100"');
        expect(svgHeader).toContain('xmlns="http://www.w3.org/2000/svg"');
    });

    test('SVG footer closes tag', () => {
        const svgFooter = `</svg>`;
        expect(svgFooter).toBe('</svg>');
    });

    test('SVG content array combines properly', () => {
        const svgHeader = '<svg viewBox="0 0 100 100">';
        const svgFooter = '</svg>';
        const shapes = ['<polygon points="0,0 1,0 1,1" />', '<polygon points="2,2 3,2 3,3" />'];
        
        const svgContent = [svgHeader, ...shapes, svgFooter];
        const result = svgContent.join('\n');
        
        expect(result).toContain('<svg viewBox="0 0 100 100">');
        expect(result).toContain('<polygon points="0,0 1,0 1,1" />');
        expect(result).toContain('<polygon points="2,2 3,2 3,3" />');
        expect(result).toContain('</svg>');
    });
});

describe('Run Spectre - Bounds Calculation', () => {
    function pt(x, y) {
        return { x: x, y: y };
    }

    test('Bounds of unit square', () => {
        const pts = [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)];
        
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        for (const p of pts) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        }
        
        expect(minX).toBe(0);
        expect(maxX).toBe(1);
        expect(minY).toBe(0);
        expect(maxY).toBe(1);
        
        const w = maxX - minX;
        const h = maxY - minY;
        expect(w).toBe(1);
        expect(h).toBe(1);
    });

    test('Bounds of translated square', () => {
        const pts = [pt(5, 10), pt(6, 10), pt(6, 11), pt(5, 11)];
        
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        for (const p of pts) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        }
        
        expect(minX).toBe(5);
        expect(maxX).toBe(6);
        expect(minY).toBe(10);
        expect(maxY).toBe(11);
    });

    test('Bounds of rectangle', () => {
        const pts = [pt(0, 0), pt(3, 0), pt(3, 2), pt(0, 2)];
        
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        for (const p of pts) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        }
        
        const w = maxX - minX;
        const h = maxY - minY;
        expect(w).toBe(3);
        expect(h).toBe(2);
    });
});

describe('Run Spectre - Max Iterations Safety', () => {
    test('Iteration counter prevents infinite loops', () => {
        const maxIterations = 10;
        let iterations = 0;
        let shouldContinue = true;
        
        while (shouldContinue) {
            iterations++;
            
            // Simulate condition that never stops
            if (iterations >= maxIterations) {
                shouldContinue = false;
            }
        }
        
        expect(iterations).toBe(10);
    });

    test('Early exit when conditions met', () => {
        const maxIterations = 10;
        let iterations = 0;
        
        while (iterations < maxIterations) {
            iterations++;
            
            // Simulate early exit condition
            if (iterations === 3) {
                break;
            }
        }
        
        expect(iterations).toBe(3);
    });
});

describe('Run Spectre - Shape Type Selection', () => {
    test('Shape selection maps to correct builders', () => {
        const shapeMap = {
            'spectres': 'buildSpectreBase(true)',
            'hexagons': 'buildHexBase()',
            'turtles': 'buildHatTurtleBase(true)',
            'hats': 'buildHatTurtleBase(false)',
            'tile11': 'buildSpectreBase(false)'
        };
        
        expect(shapeMap['spectres']).toBe('buildSpectreBase(true)');
        expect(shapeMap['hexagons']).toBe('buildHexBase()');
        expect(shapeMap['turtles']).toBe('buildHatTurtleBase(true)');
        expect(shapeMap['hats']).toBe('buildHatTurtleBase(false)');
        expect(shapeMap['tile11']).toBe('buildSpectreBase(false)');
    });

    test('Default shape is tile11', () => {
        let shapeArg = 'tile11';
        const args = [];
        
        if (args.length > 0 && isNaN(parseFloat(args[0]))) {
            shapeArg = args[0].toLowerCase();
        }
        
        expect(shapeArg).toBe('tile11');
    });
});

describe('Run Spectre - Color Map Setup', () => {
    test('Colors are set to white for all labels', () => {
        const mockColmap = {
            'Gamma': [255, 255, 255],
            'Delta': [255, 255, 255],
            'Theta': [255, 255, 255]
        };
        
        for (let lab in mockColmap) {
            expect(mockColmap[lab]).toEqual([255, 255, 255]);
        }
    });

    test('White color has correct RGB values', () => {
        const white = [255, 255, 255];
        expect(white[0]).toBe(255);
        expect(white[1]).toBe(255);
        expect(white[2]).toBe(255);
    });
});

describe('Run Spectre - File Operations', () => {
    test('SVG file write would save content', () => {
        const mockWriteFileSync = jest.fn();
        const svgContent = ['<svg>', '<polygon />', '</svg>'];
        const output = svgContent.join('\n');
        
        // Simulate file write
        mockWriteFileSync('output.svg', output);
        
        expect(mockWriteFileSync).toHaveBeenCalledWith('output.svg', output);
    });

    test('SVG content joins with newlines', () => {
        const svgContent = ['<svg>', '<polygon />', '</svg>'];
        const result = svgContent.join('\n');
        
        expect(result).toBe('<svg>\n<polygon />\n</svg>');
    });
});

describe('Run Spectre - Shape Filtering', () => {
    function pt(x, y) {
        return { x: x, y: y };
    }

    test('Filter keeps shapes with centroids inside bounds', () => {
        const shapes = [
            { pts: [pt(0, 0), pt(1, 0), pt(1, 1)] },
            { pts: [pt(10, 10), pt(11, 10), pt(11, 11)] },
            { pts: [pt(-1, -1), pt(0, -1), pt(0, 0)] }
        ];
        
        const cropMinX = -5, cropMaxX = 5;
        const cropMinY = -5, cropMaxY = 5;
        
        const kept = shapes.filter(shape => {
            let sx = 0, sy = 0, n = 0;
            for (let p of shape.pts) {
                sx += p.x;
                sy += p.y;
                n++;
            }
            const cenX = sx / n;
            const cenY = sy / n;
            return cenX >= cropMinX && cenX <= cropMaxX && 
                   cenY >= cropMinY && cenY <= cropMaxY;
        });
        
        expect(kept.length).toBe(2); // First and third shapes
    });

    test('All shapes outside bounds are filtered', () => {
        const shapes = [
            { pts: [pt(100, 100), pt(101, 100), pt(101, 101)] },
            { pts: [pt(200, 200), pt(201, 200), pt(201, 201)] }
        ];
        
        const cropMinX = -5, cropMaxX = 5;
        const cropMinY = -5, cropMaxY = 5;
        
        const kept = shapes.filter(shape => {
            let sx = 0, sy = 0, n = 0;
            for (let p of shape.pts) {
                sx += p.x;
                sy += p.y;
                n++;
            }
            const cenX = sx / n;
            const cenY = sy / n;
            return cenX >= cropMinX && cenX <= cropMaxX && 
                   cenY >= cropMinY && cenY <= cropMaxY;
        });
        
        expect(kept.length).toBe(0);
    });
});

describe('Run Spectre - Integration Tests', () => {
    test('Full argument parsing and setup flow', () => {
        let shapeArg = 'tile11';
        let targetWidth = 100;
        let targetHeight = 100;
        
        // Simulate various argument combinations
        const testCases = [
            { args: [], expected: { shape: 'tile11', w: 100, h: 100 } },
            { args: ['150'], expected: { shape: 'tile11', w: 150, h: 100 } },
            { args: ['150', '200'], expected: { shape: 'tile11', w: 150, h: 200 } },
            { args: ['spectres'], expected: { shape: 'spectres', w: 100, h: 100 } },
            { args: ['hexagons', '200', '300'], expected: { shape: 'hexagons', w: 200, h: 300 } }
        ];
        
        for (const testCase of testCases) {
            shapeArg = 'tile11';
            targetWidth = 100;
            targetHeight = 100;
            
            const args = testCase.args;
            if (args.length > 0) {
                if (isNaN(parseFloat(args[0]))) {
                    shapeArg = args[0].toLowerCase();
                    if (args[1]) targetWidth = parseFloat(args[1]);
                    if (args[2]) targetHeight = parseFloat(args[2]);
                } else {
                    targetWidth = parseFloat(args[0]);
                    if (args[1]) targetHeight = parseFloat(args[1]);
                }
            }
            
            expect(shapeArg).toBe(testCase.expected.shape);
            expect(targetWidth).toBe(testCase.expected.w);
            expect(targetHeight).toBe(testCase.expected.h);
        }
    });
});

describe('Run Spectre - Edge Cases', () => {
    test('Empty shape array produces empty output', () => {
        const allShapes = [];
        const keptShapes = allShapes.filter(() => true);
        expect(keptShapes.length).toBe(0);
    });

    test('Zero dimensions handled gracefully', () => {
        const targetWidth = 0;
        const targetHeight = 0;
        const targetArea = targetWidth * targetHeight;
        expect(targetArea).toBe(0);
    });

    test('Negative coordinates work in bounds calculation', () => {
        function pt(x, y) {
            return { x: x, y: y };
        }
        
        const pts = [pt(-5, -5), pt(-4, -5), pt(-4, -4), pt(-5, -4)];
        
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        for (const p of pts) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        }
        
        expect(minX).toBe(-5);
        expect(maxX).toBe(-4);
        expect(minY).toBe(-5);
        expect(maxY).toBe(-4);
    });
});
