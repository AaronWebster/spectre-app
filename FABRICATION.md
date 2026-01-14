# Fabrication / Manufacturing Features

This document describes the fabrication and manufacturing features in the Spectre Tile Explorer, including polygon offsetting and DXF export capabilities.

## Overview

The fabrication mode provides tools for manufacturing physical Spectre tiles using CNC cutting equipment such as water jets, laser cutters, or routers. It includes:

- **Robust polygon offsetting** for handling grout and kerf compensation
- **Tile nesting** to maximize material usage
- **Standards-compliant DXF export** compatible with CAD/CAM software
- **Unit support** for both imperial (inches) and metric (millimeters) systems

## Features

### 1. Polygon Offsetting with js-angusj-clipper

The application uses [js-angusj-clipper](https://github.com/xaviergonz/js-angusj-clipper), a WebAssembly-based implementation of Angus Johnson's Clipper library, for polygon offsetting operations.

**Why js-angusj-clipper?**
- Handles complex non-convex shapes correctly
- Properly manages self-intersections and artifacts
- Avoids "bowtie" artifacts at sharp corners
- 2-5x faster than pure JavaScript implementations
- Industry-standard algorithm used in professional CAD/CAM software

**Implementation:**
```typescript
import { offsetPolygon } from './fabrication';

// Offset a polygon inward by 0.05 inches (for kerf compensation)
const offsetShape = await offsetPolygon(originalShape, -0.05);

// Offset a polygon outward by 0.1 inches (for expansion)
const expandedShape = await offsetPolygon(originalShape, 0.1);
```

### 2. DXF Export with dxf-writer

The application uses [dxf-writer](https://github.com/ognjen-petrovic/js-dxf) for generating standards-compliant DXF files.

**Why dxf-writer?**
- Ensures proper DXF format compliance
- Handles units correctly (inches/millimeters)
- Supports layers and multiple entities
- Compatible with AutoCAD, LibreCAD, OMAX Layout, and other CAD software

**DXF Structure:**
- **STOCK layer** (white): Shows the stock material rectangle
- **CUT_PATH layer** (red): Contains the cut paths for tiles
- **Units**: Properly declared in the `$INSUNITS` header
- **Format**: Compatible with AutoCAD 2007+ (AC1021)

### 3. Fabrication Parameters

#### Cut Settings

- **Grout (inches/mm)**: The desired gap between tiles
  - Default: 0.125 inches (1/8")
  - Purpose: Allows for visual separation and installation flexibility

- **Kerf (inches/mm)**: The width of the cut made by the cutting tool
  - Default: 0.05 inches (approximately 1/16")
  - Purpose: Compensates for material removed during cutting
  - Common values:
    - Water jet: 0.030" - 0.050"
    - Laser cutter: 0.005" - 0.020"
    - Router: 0.125" - 0.250"

**Erosion Calculation:**
```
Erosion = (Grout - Kerf) / 2
```

This formula ensures that after cutting, tiles will have the desired grout spacing. The polygon is shrunk by the erosion amount on all sides.

#### Stock Settings

- **Width (inches/mm)**: Width of the stock material
  - Default: 24 inches
  
- **Height (inches/mm)**: Height of the stock material
  - Default: 24 inches

- **Margin (inches/mm)**: Safety margin from the edge of the stock
  - Default: 0.25 inches (1/4")
  - Purpose: Prevents cuts too close to the edge

#### Chain Cutting

- **Chain Cutting**: Connect tiles with bridge lines for continuous cutting
  - When enabled: Adds small connecting lines between tiles
  - Purpose: Reduces rapid movements and cutting time
  - Note: Bridges must be manually broken or left as tabs

#### Units

- **Inches**: Imperial system (default)
- **Millimeters**: Metric system

The selected unit applies to:
- All UI measurements
- DXF file unit declaration
- Stock and tile dimensions

## Usage

### Basic Workflow

1. **Switch to Fabrication Mode**
   - Select "Fabrication" from the Mode dropdown

2. **Configure Cut Settings**
   - Set Grout width (gap between tiles)
   - Set Kerf width (tool cutting width)

3. **Configure Stock Dimensions**
   - Set Width and Height of material
   - Set Margin for safety clearance

4. **Preview Nest**
   - Click "Preview Nest" to arrange tiles on stock
   - The Yield indicator shows how many tiles fit

5. **Export DXF**
   - Click "Export DXF" to download the file
   - Import into your CAD/CAM software

### Example: Water Jet Cutting

**Material:** 1/4" aluminum plate, 24" x 24"

**Settings:**
- Grout: 0.125" (1/8" gap for grouting)
- Kerf: 0.040" (typical for water jet)
- Stock: 24" x 24"
- Margin: 0.25"
- Units: Inches

**Result:**
- Erosion = (0.125 - 0.040) / 2 = 0.0425"
- Each tile shrunk by 0.0425" on all sides
- Final gap after cutting ≈ 0.125"

## API Reference

### fabrication.ts Module

#### `initializeClipper(): Promise<void>`
Initializes the clipper library. Called automatically at application startup.

#### `offsetPolygon(points: Point[], delta: number, scaleFactor?: number): Promise<Point[]>`
Offsets a polygon by the specified distance.

**Parameters:**
- `points`: Array of {x, y} points defining the polygon
- `delta`: Offset distance (positive = outward, negative = inward)
- `scaleFactor`: Integer scaling factor for precision (default: 1000)

**Returns:** Promise resolving to offset polygon points

#### `exportToDXF(shapes: Point[][], options): string`
Exports shapes to DXF format.

**Options:**
- `stockWidth`: Stock width (optional)
- `stockHeight`: Stock height (optional)
- `includeStock`: Include stock rectangle (default: false)
- `units`: 'Inches' or 'Millimeters' (default: 'Inches')

**Returns:** DXF file content as string

#### `exportFabricationDXF(shapes: Point[][], stockWidth: number, stockHeight: number, units?: string): void`
Exports fabrication DXF with stock and cut paths. Triggers browser download.

#### `exportOptimizedDXF(shapes: Point[][], units?: string): void`
Exports optimized cut paths without stock. Triggers browser download.

## Testing

The fabrication features include comprehensive unit tests:

```bash
npm test fabrication.test.js
```

**Test Coverage:**
- Polygon offsetting (inward/outward)
- Complex polygon handling
- DXF structure validation
- Layer and unit handling
- Integration tests

## Troubleshooting

### Issue: Offset produces no result
**Solution:** Check that the delta value isn't too large relative to the polygon size. Very large negative offsets can cause the polygon to disappear.

### Issue: DXF won't open in CAD software
**Solution:** 
- Verify units are set correctly
- Check that the software supports AutoCAD 2007+ format
- Try opening in LibreCAD (free, open-source) to validate the file

### Issue: Tiles don't fit as expected
**Solution:**
- Check that grout and kerf values are in the correct units
- Verify stock dimensions match your material
- Ensure margin is appropriate for your equipment

### Issue: Gaps between tiles are wrong
**Solution:** The erosion calculation compensates for both grout and kerf. Verify that:
- Kerf value matches your cutting tool
- Grout value is your desired final gap
- Formula: final gap ≈ grout (if kerf is accurate)

## Technical Notes

### Integer Coordinates

The clipper library requires integer coordinates. The `offsetPolygon` function automatically:
1. Scales coordinates up by 1000x (default)
2. Rounds to integers
3. Performs the offset
4. Scales back down to original units

This provides approximately 0.001 unit precision.

### Performance

- Polygon offsetting: ~10-50ms for typical tile shapes
- DXF generation: ~1-5ms
- Nesting (35 tiles): ~100-200ms total

The WebAssembly implementation of clipper provides significant performance benefits over pure JavaScript.

## References

- [js-angusj-clipper GitHub](https://github.com/xaviergonz/js-angusj-clipper)
- [dxf-writer GitHub](https://github.com/ognjen-petrovic/js-dxf)
- [Clipper Library Documentation](http://www.angusj.com/dxf_clipper/documentation/Docs/Overview.htm)
- [DXF File Format Specification](https://help.autodesk.com/view/OARX/2023/ENU/?guid=GUID-235B22E0-A567-4CF6-92D3-38A2306D73F3)

## License

The fabrication features use:
- **js-angusj-clipper**: MIT License
- **dxf-writer**: MIT License

Both are compatible with this project's ISC license.
