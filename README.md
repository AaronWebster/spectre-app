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
- **Pixi.js**: Hardware-accelerated WebGL rendering for improved performance
- **Modular ES6+**: Clean separation of concerns across multiple modules

### Rendering Engine

The application uses **Pixi.js v8** for high-performance 2D rendering:
- Hardware-accelerated WebGL rendering with automatic fallback to Canvas
- Efficient viewport culling - only visible tiles are rendered
- Retained mode graphics for smoother animations
- High DPI display support with automatic scaling

### Bundle Size

Bundle sizes are larger with Pixi.js but provide significant performance benefits:
- **With Pixi.js**: ~234 KB (73 KB gzipped) - Hardware-accelerated rendering
- **Previous Canvas**: 15 KB (5.22 KB gzipped) - Software rendering only

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
│   ├── types.ts           # TypeScript type definitions
│   ├── math.ts            # Matrix and vector operations
│   ├── renderer.ts        # Canvas drawing functions (legacy)
│   ├── shapes.ts          # Canvas-based Shape classes (legacy)
│   ├── pixiRenderer.ts    # Pixi.js renderer
│   ├── pixiShapes.ts      # Pixi.js-based Shape classes
│   ├── generator.ts       # Canvas tiling and substitution logic (legacy)
│   ├── generatorPixi.ts   # Pixi.js tiling and substitution logic
│   ├── constants.ts       # Color maps and tile coordinates
│   ├── main.ts            # Canvas application entry (legacy)
│   └── mainPixi.ts        # Pixi.js application entry (active)
├── index.html             # HTML entry point
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript configuration
├── app.test.js            # Canvas-based unit tests (88 tests)
├── pixi.test.js           # Pixi.js unit tests (60 tests)
└── package.json           # Dependencies and scripts
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

The project includes a comprehensive unit test suite with **148 tests** across two test files.

### Running Tests

```bash
npm install
npm test
```

### Test Coverage

**Canvas-based tests (app.test.js)** - 88 tests organized into 11 suites:
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

**Pixi.js tests (pixi.test.js)** - 60 tests organized into 4 suites:
- Pixi.js Shape Classes (19 tests)
- Pixi.js Generator Functions (5 tests)
- Pixi.js Performance Optimizations (2 tests)
- Integration tests for Matrix, Graphics, Container (34 tests)

See [TEST_DOCUMENTATION.md](TEST_DOCUMENTATION.md) for detailed information about the test suite.

## License

ISC

## Credits

Based on the paper "A Chiral Aperiodic Monotile" by David Smith, Joseph Samuel Myers, Craig S. Kaplan, and Chaim Goodman-Strauss.
