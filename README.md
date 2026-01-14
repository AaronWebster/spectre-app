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
- **Fabrication Mode**: Professional-grade manufacturing tools (see [FABRICATION.md](FABRICATION.md))
  - Robust polygon offsetting for grout/kerf compensation
  - Tile nesting for material efficiency
  - Standards-compliant DXF export for CAD/CAM software
  - Support for inches and millimeters

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

## Deployment

The application can be deployed to any static hosting service. The build process creates a fully self-contained `dist/` directory with all necessary files.

### Deployment Steps

1. **Build for production:**
   ```bash
   npm run build
   ```

2. **Deploy the `dist/` directory** to your hosting service of choice:
   - **GitHub Pages**: Push the `dist/` directory to a `gh-pages` branch
   - **Netlify**: Drag and drop the `dist/` folder or connect to your repository
   - **Vercel**: Connect to your repository or use the Vercel CLI
   - **Cloudflare Pages**: Connect to your repository or upload the `dist/` folder
   - **Any static host**: Upload the contents of `dist/` to your web server

### GitHub Pages Deployment Example

```bash
# Build the app
npm run build

# Deploy to GitHub Pages (using gh-pages package)
npm install -g gh-pages
gh-pages -d dist
```

### Custom Domain

If using a custom domain, configure your DNS settings according to your hosting provider's documentation. For GitHub Pages, add a `CNAME` file to the `public/` directory before building.

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
│   ├── pixiRenderer.ts    # Pixi.js renderer
│   ├── pixiShapes.ts      # Pixi.js-based Shape classes
│   ├── generatorPixi.ts   # Pixi.js tiling and substitution logic
│   ├── constants.ts       # Color maps and tile coordinates
│   ├── fabrication.ts     # Manufacturing/fabrication utilities
│   └── mainPixi.ts        # Application entry point
├── index.html             # HTML entry point
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript configuration
├── app.test.js            # Mathematical correctness tests (93 tests)
├── pixi.test.js           # Pixi.js component tests (60 tests)
├── fabrication.test.js    # Fabrication feature tests (7 tests)
├── FABRICATION.md         # Fabrication features documentation
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

The project includes a comprehensive unit test suite with **160 tests** across three test files.

### Running Tests

```bash
npm install
npm test
```

### Test Coverage

**Mathematical correctness tests (app.test.js)** - 93 tests organized into 11 suites:
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
- Matrix operations reference consistency (16 tests)

**Pixi.js tests (pixi.test.js)** - 60 tests organized into 4 suites:
- Pixi.js Shape Classes (19 tests)
- Pixi.js Generator Functions (5 tests)
- Pixi.js Performance Optimizations (2 tests)
- Integration tests for Matrix, Graphics, Container (34 tests)

**Fabrication tests (fabrication.test.js)** - 7 tests organized into 3 suites:
- Polygon offsetting with js-angusj-clipper (3 tests)
- DXF export with dxf-writer (3 tests)
- Integration tests for offset and export (1 test)

See [TEST_DOCUMENTATION.md](TEST_DOCUMENTATION.md) for detailed information about the test suite.

## License

ISC

## Credits

Based on the paper "A Chiral Aperiodic Monotile" by David Smith, Joseph Samuel Myers, Craig S. Kaplan, and Chaim Goodman-Strauss.
