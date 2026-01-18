# Spectre Tiling Generator

A standalone Node.js implementation for generating aperiodic Spectre tilings based on the paper "A Chiral Aperiodic Monotile" by David Smith, Joseph Samuel Myers, Craig S. Kaplan, and Chaim Goodman-Strauss.

## Overview

This project provides a command-line tool to generate SVG images of Spectre tilings and related aperiodic monotiles. The implementation uses a hierarchical substitution system to recursively construct tilings that fill any desired area without gaps or overlaps.

## Features

- **Multiple Tile Types**: Generate tilings using Spectre, Hat/Turtle, or Hexagon tiles
- **Configurable Output**: Specify custom dimensions for generated tilings
- **Waterjet/CAM Support**: Precise kerf and spacing parameters with polygon offsetting for CNC toolpath generation
- **Tile Scaling**: Uniform scaling from tile centroids to create gaps or overlaps
- **Grout Spacing**: Add adjustable spacing between tiles to simulate physical tile installations
- **SVG Export**: High-quality vector graphics output suitable for printing or further editing
- **Automatic Centering**: Crops to a centered region with proper boundary handling
- **Hierarchical Generation**: Uses supertile substitution to efficiently generate large tilings

## Installation

### Prerequisites

- Node.js 16.0.0 or higher

### Setup

```bash
# Clone the repository
git clone https://github.com/AaronWebster/spectre-app.git
cd spectre-app

# Install dependencies
npm install
```

## Usage

### Basic Usage

Generate a default tiling (100x100 units):

```bash
npm start
```

Or directly with node:

```bash
node run_spectre.cjs
```

For more usage examples including different tile types and dimensions, see [EXAMPLES.md](EXAMPLES.md).

### Specifying Dimensions

Generate a tiling with custom dimensions:

```bash
node run_spectre.cjs 200 150
# Width: 200 units, Height: 150 units
```

### Specifying Dimensions in Inches

Generate a tiling with dimensions specified in inches (converted using 96 DPI):

```bash
node run_spectre.cjs --tile-size-inches 8 6
# Width: 8 inches (768 units), Height: 6 inches (576 units)
```

The `--tile-size-inches` flag can be combined with tile type selection:

```bash
node run_spectre.cjs --tile-size-inches hexagons 5 5
# 5x5 inch hexagonal tiling
```

### Adding Grout Spacing

Add spacing between tiles (like grout in a tile floor) by specifying the spacing in inches:

```bash
node run_spectre.cjs --grout-spacing-inches 0.01 200 150
# 200x150 units with 0.01 inch spacing between tiles
```

The grout spacing parameter erodes each tile from its centroid, creating a gap between adjacent tiles without disturbing the lattice structure. This is useful for simulating physical tile installations where grout or spacing is needed.

The `--grout-spacing-inches` flag can be combined with other flags:

```bash
# 8x6 inch tiling with 0.02 inch grout spacing
node run_spectre.cjs --tile-size-inches --grout-spacing-inches 0.02 8 6

# Hexagonal tiling with grout spacing
node run_spectre.cjs hexagons --grout-spacing-inches 0.015 200 200
```

**Note:** The grout spacing value should be appropriate for the tile size. Very large spacing values relative to tile size may cause tiles to collapse to points.

### Waterjet Toolpath Generation (Kerf and Spacing)

For CNC waterjet cutting or other CAM (Computer-Aided Manufacturing) applications, you can specify precise kerf and spacing parameters to generate accurate toolpaths.

**Kerf** is the width of material removed by the cutting stream. **Spacing** is the desired gap between adjacent tiles (grout line).

**Important:** Kerf and spacing values are specified in inches and must be appropriate for your tile scale. The base Spectre tiles are approximately 5 units in size, so when generating 100x100 unit output, use very small kerf/spacing values (e.g., 0.001-0.01 inches). For larger physical tiles, generate larger output dimensions using `--tile-size-inches`.

```bash
# Small kerf and spacing for base tile size
node run_spectre.cjs --kerf 0.001 --spacing 0.005 200 150
# Kerf: 0.001 inches (0.096 units), Spacing: 0.005 inches (0.48 units)

# For 8x6 inch physical output with larger relative kerf/spacing
node run_spectre.cjs --tile-size-inches --kerf 0.01 --spacing 0.03 8 6
# This creates 768x576 unit output where kerf/spacing are more appropriate
```

The toolpath calculation uses the formula:
```
offset = -((spacing / 2) + (kerf / 2))
```

This ensures:
- Each tile is offset inward by half the spacing (shared gap between neighbors)
- Plus half the kerf (so the cutting stream edge hits the desired line)
- Uses centroid-based erosion which works well for the symmetric Spectre tile shapes

```bash
# Combine with other flags
node run_spectre.cjs --tile-size-inches --kerf 0.01 --spacing 0.03 8 6

# Different tile types with waterjet parameters
node run_spectre.cjs hexagons --tile-size-inches --kerf 0.01 --spacing 0.02 10 10
```

**Technical Note:** The implementation uses centroid-based erosion, moving each vertex toward the tile's center by the calculated offset distance. For the relatively symmetric Spectre tile geometries, this provides good approximations for spacing. For complex concave shapes requiring true equidistant offsetting, dedicated CAM software is recommended.

### Tile Scaling

You can scale tiles uniformly from their centroids to create gaps or overlaps:

```bash
# Scale tiles to 95% of original size (creates 5% gaps)
node run_spectre.cjs --scale 0.95 200 150

# Scale tiles to 90% (creates 10% gaps)
node run_spectre.cjs --scale 0.9 --tile-size-inches 10 10

# Combine scaling with kerf/spacing (scale is applied first)
node run_spectre.cjs --scale 0.98 --kerf 0.001 --spacing 0.002 200 150
```

**Note:** Scaling is applied before polygon offsetting. A scale of 1.0 (default) leaves tiles at their original size.

### Selecting Tile Types

Choose different tile types:

```bash
# Spectre tiles (default "Tile(1,1)" variant)
node run_spectre.cjs tile11 200 150

# Curved Spectre tiles
node run_spectre.cjs spectres 200 150

# Hexagon tiles
node run_spectre.cjs hexagons 200 150

# Hat tiles with Turtle insets
node run_spectre.cjs turtles 200 150

# Turtle tiles with Hat insets
node run_spectre.cjs hats 200 150
```

### Output

The program generates an `output.svg` file in the current directory containing the tiling.

## Project Structure

```
spectre-tiling/
├── spectre.cjs           # Core tiling logic and shape definitions
├── run_spectre.cjs       # Command-line interface and SVG generation
├── spectre.test.js       # Unit tests for core tiling logic
├── run_spectre.test.js   # Unit tests for CLI and generation
├── 2305.17743v2.pdf      # Reference publication
├── package.json          # Project dependencies and scripts
├── jest.config.js        # Jest testing configuration
├── README.md             # This file
└── LICENSE               # License file
```

## Testing

The project includes comprehensive unit tests covering:
- Point and affine matrix operations
- Tile geometry construction (Spectre, Hat, Turtle, Hexagon)
- Supertile substitution system
- Shape classes and rendering
- SVG generation and cropping logic

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-run on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Algorithm

The tiling generation follows these steps:

1. **Initialize Base System**: Create the base tile shapes according to the selected type
2. **Hierarchical Substitution**: Repeatedly apply supertile substitution rules until the tiling covers the target area with sufficient margin
3. **Flatten Hierarchy**: Traverse the hierarchical structure to extract all primitive shapes
4. **Center and Crop**: Calculate the centroid of all shapes and crop to the desired dimensions
5. **SVG Generation**: Export the visible shapes as SVG polygons

### Stopping Criterion

The algorithm stops when:
- Physical bounds exceed 1.5× the target dimensions
- Total area exceeds the growth factor (≈7.87) times the target area

This ensures the cropped region contains only fully-formed tiles without boundary artifacts.

## Mathematics

The Spectre tile is a 14-sided polygon that tiles the plane aperiodically (without repeating patterns). The tiling uses a substitution system where tiles are grouped into "supertiles" that follow specific adjacency rules.

Key properties:
- **Aperiodic**: No translational symmetry
- **Chiral**: The tile has a "handedness" (left/right)
- **Monotile**: A single tile shape tiles the entire plane
- **Edge-to-edge**: Tiles meet only along complete edges

## Code Quality

This project follows JavaScript/Node.js best practices:

- **CommonJS Modules**: Uses `.cjs` extension for explicit CommonJS modules
- **Comprehensive Testing**: 163+ unit tests with Jest
- **Clear Documentation**: JSDoc-style comments throughout
- **Descriptive Naming**: Self-documenting variable and function names
- **Separation of Concerns**: Core logic separated from CLI interface
- **Error Handling**: Graceful handling of edge cases
- **Version Control**: Proper .gitignore for Node.js projects

## Reference

This implementation is based on the paper:

**"A Chiral Aperiodic Monotile"**  
David Smith, Joseph Samuel Myers, Craig S. Kaplan, and Chaim Goodman-Strauss  
arXiv:2305.17743v2 [math.CO]

The reference PDF is included in this repository: `2305.17743v2.pdf`

## License

ISC License - See LICENSE file for details

## Credits

Original research by David Smith, Joseph Samuel Myers, Craig S. Kaplan, and Chaim Goodman-Strauss.

Implementation inspired by the reference code and visualizations from the paper.
