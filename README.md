# Spectre Tile Explorer

Interactive JavaScript application for exploring the Spectre tile from "A Chiral Aperiodic Monotile" by David Smith, Joseph Samuel Myers, Craig S. Kaplan, and Chaim Goodman-Strauss.

## Features

- Interactive visualization of the Spectre tile and related aperiodic tilings
- Multiple tile types: Spectre, Hat/Turtle, and Hexagons
- Dense tiling: viewport is always fully populated with tiles (no whitespace)
- Efficient rendering with viewport culling for optimal performance
- Zoom and pan controls (mouse wheel and drag, or pinch-to-zoom on touch devices)
- Export to SVG format
- Tile numbering option

## Usage

Open `index.html` in a web browser. The application requires an internet connection to load the p5.js library from CDN.

### Controls

- **Mouse Wheel**: Zoom in/out
- **Click and Drag**: Pan the view
- **Touch Devices**: Pinch to zoom, drag to pan
- **UI Controls**: Use the left sidebar to change shapes and export settings

## File Structure

- `index.html` - Main HTML page with proper HTML5 structure
- `app.js` - JavaScript application code with modern ES6+ practices
- `app.html` - Legacy single-file version (deprecated)

## Code Quality

The codebase follows modern JavaScript best practices:
- Proper separation of concerns (HTML, CSS, JavaScript)
- ES6+ features (const/let, arrow functions, template literals)
- Comprehensive JSDoc documentation
- Descriptive variable and function names
- Organized code structure with clear sections
- Proper encapsulation with classes
