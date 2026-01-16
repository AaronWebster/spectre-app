# Usage Examples

This document provides practical examples of using the Spectre Tiling Generator.

## Basic Examples

### Default Tiling (100x100)
```bash
npm start
# or
node run_spectre.cjs
```
Generates a 100x100 unit Spectre tiling with the default "Tile(1,1)" configuration.

### Custom Dimensions
```bash
node run_spectre.cjs 200 150
```
Generates a 200x150 unit tiling.

### Square Tiling (200x200)
```bash
node run_spectre.cjs 200 200
```
Generates a large square tiling.

## Tile Type Examples

### Tile(1,1) - Default Spectre
```bash
node run_spectre.cjs tile11 150 150
```
The standard Spectre monotile configuration.

### Curved Spectre Tiles
```bash
node run_spectre.cjs spectres 150 150
```
Spectre tiles with curved edges for a more organic appearance.

### Hexagonal Tiles
```bash
node run_spectre.cjs hexagons 200 200
```
Regular hexagonal tiling for comparison with aperiodic tilings.

### Hat and Turtle Tiles
```bash
# Hat tiles with turtle inserts
node run_spectre.cjs turtles 150 150

# Turtle tiles with hat inserts
node run_spectre.cjs hats 150 150
```
Related aperiodic monotiles from the same research paper.

## Output

All commands generate an `output.svg` file in the current directory that can be:
- Opened in any web browser
- Edited in vector graphics software (Inkscape, Adobe Illustrator)
- Printed at any scale without quality loss
- Used as patterns or textures

## Performance Tips

1. **Start Small**: Begin with 100x100 dimensions to verify everything works
2. **Increase Gradually**: Larger dimensions require exponentially more computation
3. **Monitor Memory**: Very large tilings (>500x500) may require significant RAM
4. **Iteration Count**: The program automatically determines the optimal number of supertile iterations

## Mathematical Background

The Spectre tile is a 14-sided polygon that tiles the plane aperiodically. Key properties:
- Each edge has unit length
- Total of 14 vertices
- Interior angles are combinations of 60° and 120°
- The tiling never repeats, even if extended infinitely

## Troubleshooting

**Problem**: Output file is too large
- **Solution**: Reduce dimensions or use simpler tile types (hexagons are smallest)

**Problem**: Generation takes too long
- **Solution**: Reduce dimensions; complexity grows exponentially

**Problem**: Output looks incomplete or has artifacts
- **Solution**: This shouldn't happen with default settings; please report as a bug
