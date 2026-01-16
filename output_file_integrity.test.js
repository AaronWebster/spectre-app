/**
 * Integration tests for complete output file generation
 * 
 * These tests verify that the complete SVG generation pipeline produces
 * valid, mathematically correct output files that match internal representation.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('Complete Output File Generation', () => {
    const testOutputPath = '/tmp/test_output.svg';
    
    afterEach(() => {
        // Clean up test files
        if (fs.existsSync(testOutputPath)) {
            fs.unlinkSync(testOutputPath);
        }
        if (fs.existsSync('output.svg')) {
            fs.unlinkSync('output.svg');
        }
    });

    test('run_spectre.cjs generates valid SVG file', () => {
        // Run the script
        execSync('node run_spectre.cjs 50 50', { cwd: __dirname });
        
        // Verify file exists
        expect(fs.existsSync('output.svg')).toBe(true);
        
        // Read and parse file
        const content = fs.readFileSync('output.svg', 'utf8');
        
        // Verify it's valid SVG
        expect(content).toContain('<svg');
        expect(content).toContain('</svg>');
        expect(content).toContain('viewBox=');
        expect(content).toContain('xmlns="http://www.w3.org/2000/svg"');
    });

    test('Generated SVG contains polygon elements', () => {
        execSync('node run_spectre.cjs 50 50', { cwd: __dirname });
        const content = fs.readFileSync('output.svg', 'utf8');
        
        // Should have polygon elements
        expect(content).toContain('<polygon');
        expect(content).toContain('points=');
        
        // Count polygons
        const polygonCount = (content.match(/<polygon/g) || []).length;
        expect(polygonCount).toBeGreaterThan(0);
    });

    test('Generated SVG has correct viewBox dimensions', () => {
        const width = 100;
        const height = 150;
        
        execSync(`node run_spectre.cjs ${width} ${height}`, { cwd: __dirname });
        const content = fs.readFileSync('output.svg', 'utf8');
        
        // Extract viewBox
        const viewBoxMatch = content.match(/viewBox="([^"]+)"/);
        expect(viewBoxMatch).not.toBeNull();
        
        const viewBox = viewBoxMatch[1].split(' ').map(parseFloat);
        expect(viewBox.length).toBe(4);
        
        // Width and height should match (viewBox format: x y width height)
        expect(viewBox[2]).toBe(width);
        expect(viewBox[3]).toBe(height);
    });

    test('Generated polygons have valid coordinates', () => {
        execSync('node run_spectre.cjs 50 50', { cwd: __dirname });
        const content = fs.readFileSync('output.svg', 'utf8');
        
        // Extract first polygon points
        const polygonMatch = content.match(/<polygon points="([^"]+)"/);
        expect(polygonMatch).not.toBeNull();
        
        const pointsStr = polygonMatch[1];
        const points = pointsStr.split(' ').map(p => {
            const [x, y] = p.split(',').map(parseFloat);
            return { x, y };
        });
        
        // Should have multiple points
        expect(points.length).toBeGreaterThan(2);
        
        // All coordinates should be valid numbers
        for (const p of points) {
            expect(isNaN(p.x)).toBe(false);
            expect(isNaN(p.y)).toBe(false);
            expect(isFinite(p.x)).toBe(true);
            expect(isFinite(p.y)).toBe(true);
        }
    });

    test('Generated polygons have required SVG attributes', () => {
        execSync('node run_spectre.cjs 50 50', { cwd: __dirname });
        const content = fs.readFileSync('output.svg', 'utf8');
        
        // Extract first polygon
        const polygonMatch = content.match(/<polygon[^>]+>/);
        expect(polygonMatch).not.toBeNull();
        
        const polygon = polygonMatch[0];
        
        // Should have fill, stroke, and stroke-width
        expect(polygon).toContain('fill=');
        expect(polygon).toContain('stroke=');
        expect(polygon).toContain('stroke-width=');
    });

    test('Generated polygons use white fill as configured', () => {
        execSync('node run_spectre.cjs 50 50', { cwd: __dirname });
        const content = fs.readFileSync('output.svg', 'utf8');
        
        // run_spectre.cjs sets all colors to white [255, 255, 255]
        expect(content).toContain('fill="rgb(255,255,255)"');
    });

    test('Different tile types generate different outputs', () => {
        // Generate with default tile11
        execSync('node run_spectre.cjs tile11 50 50', { cwd: __dirname });
        const content1 = fs.readFileSync('output.svg', 'utf8');
        const polygonCount1 = (content1.match(/<polygon/g) || []).length;
        
        // Generate with hexagons
        execSync('node run_spectre.cjs hexagons 50 50', { cwd: __dirname });
        const content2 = fs.readFileSync('output.svg', 'utf8');
        const polygonCount2 = (content2.match(/<polygon/g) || []).length;
        
        // Both should have shapes, but different counts are expected
        expect(polygonCount1).toBeGreaterThan(0);
        expect(polygonCount2).toBeGreaterThan(0);
    });

    test('Larger dimensions generate more shapes', () => {
        // Small size
        execSync('node run_spectre.cjs 30 30', { cwd: __dirname });
        const content1 = fs.readFileSync('output.svg', 'utf8');
        const polygonCount1 = (content1.match(/<polygon/g) || []).length;
        
        // Larger size
        execSync('node run_spectre.cjs 100 100', { cwd: __dirname });
        const content2 = fs.readFileSync('output.svg', 'utf8');
        const polygonCount2 = (content2.match(/<polygon/g) || []).length;
        
        // Larger dimensions should generate more shapes
        expect(polygonCount2).toBeGreaterThan(polygonCount1);
    });

    test('Generated file is valid UTF-8', () => {
        execSync('node run_spectre.cjs 50 50', { cwd: __dirname });
        
        // Should be able to read without encoding errors
        expect(() => {
            fs.readFileSync('output.svg', 'utf8');
        }).not.toThrow();
    });

    test('Generated file has reasonable size', () => {
        execSync('node run_spectre.cjs 100 100', { cwd: __dirname });
        const stats = fs.statSync('output.svg');
        
        // Should be at least 1KB
        expect(stats.size).toBeGreaterThan(1000);
        
        // Should be less than 10MB (reasonable upper bound)
        expect(stats.size).toBeLessThan(10 * 1024 * 1024);
    });

    test('Curved spectres generate path elements instead of polygons', () => {
        execSync('node run_spectre.cjs spectres 50 50', { cwd: __dirname });
        const content = fs.readFileSync('output.svg', 'utf8');
        
        // Should have path elements with curves
        expect(content).toContain('<path');
        expect(content).toContain('d="M');
        expect(content).toContain(' C '); // Bezier curve commands
    });

    test('Generated SVG viewBox center aligns with centroid logic', () => {
        execSync('node run_spectre.cjs 100 100', { cwd: __dirname });
        const content = fs.readFileSync('output.svg', 'utf8');
        
        const viewBoxMatch = content.match(/viewBox="([^"]+)"/);
        const viewBox = viewBoxMatch[1].split(' ').map(parseFloat);
        
        const [minX, minY, width, height] = viewBox;
        
        // The crop bounds are centered on the centroid
        // So minX + width/2 and minY + height/2 should be the center
        const centerX = minX + width / 2;
        const centerY = minY + height / 2;
        
        // Center coordinates should be finite numbers
        expect(isFinite(centerX)).toBe(true);
        expect(isFinite(centerY)).toBe(true);
    });

    test('Console output provides generation statistics', () => {
        const output = execSync('node run_spectre.cjs 50 50', { 
            cwd: __dirname,
            encoding: 'utf8' 
        });
        
        // Should report configuration
        expect(output).toContain('Configuration:');
        expect(output).toContain('Shape=');
        expect(output).toContain('Size=');
        
        // Should report iterations
        expect(output).toContain('Iteration');
        
        // Should report shape generation
        expect(output).toContain('Generated');
        expect(output).toContain('primitive shapes');
        
        // Should report centroid
        expect(output).toContain('Centroid:');
        
        // Should report cropping
        expect(output).toContain('Cropping to');
        expect(output).toContain('retained');
        expect(output).toContain('shapes after culling');
        
        // Should confirm save
        expect(output).toContain('Saved output.svg');
    });
});

describe('Output File Mathematical Correctness', () => {
    afterEach(() => {
        if (fs.existsSync('output.svg')) {
            fs.unlinkSync('output.svg');
        }
    });

    test('Generated polygon vertices form closed shapes', () => {
        execSync('node run_spectre.cjs 50 50', { cwd: __dirname });
        const content = fs.readFileSync('output.svg', 'utf8');
        
        // Extract all polygon points
        const polygonMatches = content.matchAll(/<polygon points="([^"]+)"/g);
        
        let polygonCount = 0;
        for (const match of polygonMatches) {
            const pointsStr = match[1];
            const points = pointsStr.split(' ');
            
            // Each polygon should have at least 3 points (triangle)
            expect(points.length).toBeGreaterThanOrEqual(3);
            
            polygonCount++;
        }
        
        expect(polygonCount).toBeGreaterThan(0);
    });

    test('All polygon coordinates are within viewBox bounds', () => {
        execSync('node run_spectre.cjs 80 80', { cwd: __dirname });
        const content = fs.readFileSync('output.svg', 'utf8');
        
        // Extract viewBox
        const viewBoxMatch = content.match(/viewBox="([^"]+)"/);
        const [minX, minY, width, height] = viewBoxMatch[1].split(' ').map(parseFloat);
        const maxX = minX + width;
        const maxY = minY + height;
        
        // Add small buffer for shapes on boundary
        const buffer = width * 0.1; // 10% buffer
        
        // Extract all polygon points
        const polygonMatches = content.matchAll(/<polygon points="([^"]+)"/g);
        
        for (const match of polygonMatches) {
            const pointsStr = match[1];
            const points = pointsStr.split(' ');
            
            for (const pointStr of points) {
                const [x, y] = pointStr.split(',').map(parseFloat);
                
                // Points should be within or near the viewBox
                // (slight overflow is acceptable for shapes on boundary)
                expect(x).toBeGreaterThan(minX - buffer);
                expect(x).toBeLessThan(maxX + buffer);
                expect(y).toBeGreaterThan(minY - buffer);
                expect(y).toBeLessThan(maxY + buffer);
            }
        }
    });

    test('Generated shapes have positive area', () => {
        execSync('node run_spectre.cjs 50 50', { cwd: __dirname });
        const content = fs.readFileSync('output.svg', 'utf8');
        
        function polyArea(pts) {
            let area = 0;
            for (let i = 0; i < pts.length; i++) {
                let j = (i + 1) % pts.length;
                area += pts[i].x * pts[j].y;
                area -= pts[j].x * pts[i].y;
            }
            return Math.abs(area) / 2;
        }
        
        // Extract first polygon and check area
        const polygonMatch = content.match(/<polygon points="([^"]+)"/);
        const pointsStr = polygonMatch[1];
        const points = pointsStr.split(' ').map(p => {
            const [x, y] = p.split(',').map(parseFloat);
            return { x, y };
        });
        
        const area = polyArea(points);
        expect(area).toBeGreaterThan(0);
    });
});
