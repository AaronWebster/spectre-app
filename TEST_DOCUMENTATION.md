# Test Documentation for app.js

This document describes the comprehensive unit test suite for the Spectre app's mathematical rendering functions, based on the paper "A Chiral Aperiodic Monotile" by David Smith, Joseph Samuel Myers, Craig S. Kaplan, and Chaim Goodman-Strauss (2305.17743v2.pdf).

## Overview

The test suite (`app.test.js`) contains **87 tests** organized into **11 test suites** that verify the mathematical correctness of the Spectre tile rendering implementation.

## Test Coverage

### 1. Point Operations (5 tests)
Tests the fundamental point manipulation functions:
- `pt()` - Point creation
- `padd()` - Point addition
- `psub()` - Point subtraction  
- `pframe()` - Computing points in frame coordinates (basis vectors)

**Paper Reference**: Basic geometric primitives used throughout the implementation.

### 2. Affine Matrix Operations (20 tests)
Tests the 2D affine transformation matrices (represented as 6-element arrays `[a, b, c, d, e, f]`):
- `inv()` - Matrix inverse computation
- `mul()` - Matrix multiplication
- `trot()` - Rotation matrix generation (0°, 60°, 90°, 120°, 180°)
- `ttrans()` - Translation matrix generation
- `transPt()` - Applying transformations to points
- `rotAbout()` - Rotation about arbitrary points
- `matchSeg()` - Matching unit interval to line segment
- `matchTwo()` - Matching two line segments
- `transTo()` - Translation from one point to another

**Paper Reference**: Section 2.2 discusses transformations and isometries. The paper uses affine transformations extensively to describe tile placements.

### 3. Spectre Tile Geometry (8 tests)
Verifies the Tile(1,1) Spectre polygon geometry:
- 14 vertices with unit-length edges
- Correct vertex positions
- 4 key points (quad points) at vertices 3, 5, 7, 11
- Interior angles alternating between multiples of 90° and 120°
- Mathematical constants (√3, √3/2)

**Paper Reference**: 
- Figure 1.1 shows Tile(1,1) as a 14-sided equilateral polygon
- Section 2 states "interior angles at the vertices of Tile(1,1) strictly alternate between multiples of 90° and multiples of 120°"
- The spectre is defined with 14 unit-length edges

### 4. Hat and Turtle Tile Geometry (7 tests)
Tests the Hat and Turtle tiles from the [3.4.6.4] Laves tiling:
- Both tiles have 14 vertices (same topology as Spectre)
- Correct vertex computation using hexagonal grid functions
- Edge lengths are either 1 or √3 (matching kite grid)
- Combinatorial equivalence to Tile(1,1)

**Paper Reference**:
- Section 3: "From Spectres to hats and turtles"
- Theorem 3.1: "There is a bijection between combinatorially equivalent tilings by Tile(1,1) and by the set {hat, turtle}"
- Hat is Tile(1, √3) and Turtle is Tile(√3, 1)

### 5. Hexagon Tile Geometry (5 tests)
Verifies regular hexagon construction:
- 6 vertices with unit edge lengths
- All interior angles are 120°
- Correct height (2 × √3/2)
- Proper centering

**Paper Reference**: Section 4 discusses marked hexagons used in the substitution system proof.

### 6. Supertile Substitution System (5 tests)
Tests the hierarchical substitution rules:
- Transformation angles: [60°, 0°, 60°, 60°, 0°, 60°, -120°] sum to 120°
- Reflection matrix R = [-1, 0, 0, 0, 1, 0]
- Specific rotations (60°, -120°)
- Orientation preservation through transformations

**Paper Reference**:
- Figure 2.1: Substitution rules for Spectre and Mystic
- Section 4 describes the transformation matrices for supertile construction
- The cumulative 120° rotation is consistent with the hexagonal structure

### 7. Mathematical Constants (4 tests)
Verifies precision of mathematical constants:
- π ≈ 3.14159265358979
- √3 ≈ 1.7320508075688772
- √3/2 ≈ 0.8660254037844386
- Radian conversion

**Paper Reference**: These constants appear throughout the paper in angle measurements and tile coordinates.

### 8. Determinant and Matrix Properties (5 tests)
Tests linear algebra properties:
- Identity, rotation, and translation matrices have determinant 1
- Reflection matrix has determinant -1
- Matrix multiplication preserves determinant relationships

**Paper Reference**: Section 2 discusses orientation-preserving (det=1) vs orientation-reversing (det=-1) isometries.

### 9. Tile Substitution Rules (2 tests)
Verifies the substitution rule structure:
- 9 tile categories (Gamma, Delta, Theta, Lambda, Xi, Pi, Sigma, Phi, Psi)
- Each rule produces 8 tiles (with one potentially null)
- Each rule ends with Gamma (the Mystic)
- Transformation indices are in valid range [0-3]

**Paper Reference**:
- Figure 2.1 and surrounding text describe the substitution system
- The super_rules dictionary follows the combinatorial rules from the paper
- Section 5 proves these rules are hierarchical

### 10. Edge Cases and Boundary Conditions (5 tests)
Tests robustness:
- Zero vector transformations
- Multiple transformation composition
- Inverse of composed transformations
- Frame computation with zero coefficients
- Degenerate cases (identical segment endpoints)

### 11. Tile Scale and Bounding Box (10 tests)
Tests the new tile scaling and bounding box culling features:
- Tile scale of 1 maintains original size
- Tile scale of 2 doubles the size
- Bounding box dimensions create correct viewport
- Tiles completely inside bounds are visible
- Tiles completely outside bounds are invisible
- Tiles partially overlapping bounds are visible
- Asymmetric bounding boxes work correctly
- Different tile scales affect bounding box correctly
- Rotation preserves bounding box checks
- Visible tile count is tracked separately from total count

**Implementation Reference**: These tests verify the `isTileOutsideBounds()` function and the tile scale/bounding box UI features that allow users to control tile visibility and scale.

## Running the Tests

```bash
npm test
```

## Test Philosophy

These tests focus on **mathematical correctness** rather than visual rendering. They verify:

1. **Geometric accuracy**: Tile vertices, edge lengths, and angles match paper specifications
2. **Transformation correctness**: Affine matrices properly compose and invert
3. **Substitution system integrity**: Hierarchical rules follow the paper's combinatorial structure
4. **Numerical precision**: Constants and calculations maintain sufficient accuracy

## Key Mathematical Relationships Verified

1. **Affine transformation composition**: `M1 ∘ M2 = mul(M1, M2)`
2. **Matrix inverse**: `M ∘ M⁻¹ = I`
3. **Rotation orthogonality**: `det(R) = 1` for rotations
4. **Unit edge lengths**: All Spectre edges are length 1
5. **Angle constraints**: Interior angles are multiples of 30° (covering 90° and 120° families)
6. **Combinatorial equivalence**: Spectre, Hat, and Turtle tiles have equivalent topology

## References

- Original paper: "A Chiral Aperiodic Monotile" (2305.17743v2.pdf)
- Implementation: `app.js`
- Interactive demo: cs.uwaterloo.ca/~csk/spectre/
