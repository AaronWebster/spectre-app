# Spectre Tile Explorer

Interactive TypeScript application for exploring the Spectre tile from "A Chiral Aperiodic Monotile" by David Smith, Joseph Samuel Myers, Craig S. Kaplan, and Chaim Goodman-Strauss.

## Features

- Interactive visualization of the Spectre tile and related aperiodic tilings
- Multiple tile types: Spectre, Hat/Turtle, and Hexagons
- Dense tiling: viewport is always fully populated with tiles (no whitespace)
- Viewport culling: tiles outside the visible area are not rendered for optimal performance
- Zoom and pan controls (mouse wheel and drag, or pinch-to-zoom on touch devices)
- Export to SVG format
- Tile numbering option

## Modern Architecture

This application has been modernized with:

- **TypeScript**: Full type safety for mathematical operations and shapes
- **Vite**: Fast development server with HMR and optimized production builds
- **Modular ES6+**: Clean separation of concerns across multiple modules
- **No External Dependencies**: Removed p5.js (~913 KB) for a lean bundle size

### Bundle Size

- **Before**: 957 KB (p5.js + app.js)
- **After**: 15 KB (5.22 KB gzipped)
- **Reduction**: 98.4% smaller! 🚀

## Development

### Prerequisites

- Node.js 16+ and npm

### Installation

```bash
npm install
```

### Development Server

Start the Vite development server with hot module replacement:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

Create an optimized production build:

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

Preview the production build locally:

```bash
npm run preview
```

## Usage

### Controls

- **Mouse Wheel**: Zoom in/out
- **Click and Drag**: Pan the view
- **Touch Devices**: Pinch to zoom, drag to pan
- **UI Controls**: Use the left sidebar to change shapes and export settings

## Project Structure

```
spectre-app/
├── src/
│   ├── types.ts         # TypeScript type definitions
│   ├── math.ts          # Matrix and vector operations
│   ├── renderer.ts      # Canvas drawing functions
│   ├── shapes.ts        # Shape, CurvyShape, Meta classes
│   ├── generator.ts     # Tiling and substitution logic
│   ├── constants.ts     # Color maps and tile coordinates
│   └── main.ts          # Application entry point
├── index.html           # HTML entry point
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies and scripts
```

## Code Quality

The codebase follows modern TypeScript best practices:

- Strong typing with interfaces for Point, TransformMatrix, Color, etc.
- Modular architecture with clear separation of concerns
- ES6+ features (const/let, arrow functions, template literals)
- Comprehensive JSDoc documentation
- Descriptive variable and function names
- Organized code structure with clear modules

## Testing

The project includes a comprehensive unit test suite for the mathematical rendering functions based on the original paper "A Chiral Aperiodic Monotile" (2305.17743v2.pdf).

### Running Tests

```bash
npm install
npm test
```

### Test Coverage

The test suite includes **88 tests** organized into 11 suites:

- Point operations (5 tests)
- Affine matrix operations (20 tests)
- Spectre tile geometry (8 tests)
- Hat and Turtle tile geometry (7 tests)
- Hexagon tile geometry (5 tests)
- Supertile substitution system (5 tests)
- Mathematical constants (4 tests)
- Determinant and matrix properties (5 tests)
- Tile substitution rules (2 tests)
- Edge cases and boundary conditions (5 tests)
- Tile counting and bounding box (11 tests)
- Syntax validation (1 test)

See [TEST_DOCUMENTATION.md](TEST_DOCUMENTATION.md) for detailed information about the test suite.

## License

ISC

## Credits

Based on the paper "A Chiral Aperiodic Monotile" by David Smith, Joseph Samuel Myers, Craig S. Kaplan, and Chaim Goodman-Strauss.
